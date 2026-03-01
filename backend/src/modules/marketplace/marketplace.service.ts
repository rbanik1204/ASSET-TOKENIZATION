import {
  Injectable, Logger, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import algosdk from 'algosdk';
import { ConfigService } from '@nestjs/config';

import { AlgorandService } from '../wallet/services/algorand.service';
import { MarketplaceListing, ListingStatus, ListingType } from './entities/listing.entity';
import { MarketplaceTrade, TradeStatus } from './entities/trade.entity';
import { Asset } from '../assets/entities/asset.entity';
import {
  CreateListingDto, PrepareBuyDto, ConfirmBuyDto,
  ListingFiltersDto,
} from './dto/marketplace.dto';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

// Fee recipient — admin address from config
const PLATFORM_FEE_BPS = 250; // 2.5 %

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
    @InjectRepository(MarketplaceTrade)
    private readonly tradeRepo: Repository<MarketplaceTrade>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    private readonly algorand: AlgorandService,
    private readonly config: ConfigService,
  ) {}

  // ═════════════════════════════════════════════════════════════
  // LISTINGS
  // ═════════════════════════════════════════════════════════════

  /** List all listings with pagination & filters */
  async findAll(
    pagination: PaginationDto,
    filters?: ListingFiltersDto,
  ): Promise<PaginatedResponseDto<MarketplaceListing>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.listingRepo.createQueryBuilder('l');

    // Default to active listings
    if (filters?.status) {
      qb.andWhere('l.status = :status', { status: filters.status });
    } else {
      qb.andWhere('l.status IN (:...statuses)', {
        statuses: [ListingStatus.ACTIVE, ListingStatus.PARTIAL],
      });
    }

    if (filters?.assetId) qb.andWhere('l.assetId = :assetId', { assetId: filters.assetId });
    if (filters?.category) qb.andWhere('l.category = :category', { category: filters.category });
    if (filters?.sellerAddress) qb.andWhere('l.sellerAddress = :seller', { seller: filters.sellerAddress });

    // Sort
    const sortField = filters?.sortBy === 'price' ? 'l.pricePerUnit'
      : filters?.sortBy === 'quantity' ? 'l.remainingQuantity'
      : 'l.createdAt';
    qb.orderBy(sortField, (filters?.sortDir || 'desc').toUpperCase() as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  /** Get single listing */
  async findOne(id: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  /** Get listings for a specific seller */
  async findBySeller(sellerAddress: string): Promise<MarketplaceListing[]> {
    return this.listingRepo.find({
      where: { sellerAddress },
      order: { createdAt: 'DESC' },
    });
  }

  // ── CREATE LISTING ────────────────────────────────────────

  async createListing(dto: CreateListingDto): Promise<MarketplaceListing> {
    // Validate the asset exists
    const asset = await this.assetRepo.findOne({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException(`Asset ${dto.assetId} not found`);
    if (!asset.asaId) throw new BadRequestException('Asset has not been tokenized on Algorand yet');

    // Verify the seller actually holds enough of this ASA
    try {
      const acctInfo = await this.algorand.getAccountInfo(dto.sellerAddress);
      const assetHolding = acctInfo['assets']?.find(
        (a: any) => a['asset-id'] === Number(dto.asaId),
      );
      if (!assetHolding || Number(assetHolding.amount) < dto.quantity) {
        throw new BadRequestException(
          `Insufficient ASA balance. You have ${assetHolding?.amount || 0} units but tried to list ${dto.quantity}`,
        );
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Could not verify on-chain balance: ${err.message}`);
    }

    // Check for duplicate active listing
    const existing = await this.listingRepo.findOne({
      where: {
        sellerAddress: dto.sellerAddress,
        asaId: dto.asaId,
        status: In([ListingStatus.ACTIVE, ListingStatus.PARTIAL]),
      },
    });
    if (existing) {
      throw new ConflictException(
        `You already have an active listing for this asset (${existing.id}). Cancel it first or wait for it to fill.`,
      );
    }

    const listing = this.listingRepo.create({
      assetId: dto.assetId,
      asaId: dto.asaId,
      assetName: dto.assetName,
      unitName: dto.unitName,
      category: dto.category || asset.category || null,
      sellerAddress: dto.sellerAddress,
      pricePerUnit: dto.pricePerUnit,
      originalQuantity: dto.quantity,
      remainingQuantity: dto.quantity,
      minPurchase: dto.minPurchase || 1,
      platformFeeBps: PLATFORM_FEE_BPS,
      description: dto.description || null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      status: ListingStatus.ACTIVE,
      listingType: ListingType.SELL,
    });

    const saved = await this.listingRepo.save(listing);
    this.logger.log(`Listing created: ${saved.id} — ${dto.quantity} units of ASA ${dto.asaId} @ ${dto.pricePerUnit} ALGO`);
    return saved;
  }

  // ── CANCEL LISTING ────────────────────────────────────────

  async cancelListing(id: string, sellerAddress: string): Promise<MarketplaceListing> {
    const listing = await this.findOne(id);

    if (listing.sellerAddress !== sellerAddress) {
      throw new ForbiddenException('Only the seller can cancel this listing');
    }

    if (listing.status === ListingStatus.FILLED) {
      throw new BadRequestException('This listing is already fully sold');
    }

    if (listing.status === ListingStatus.CANCELLED) {
      throw new BadRequestException('This listing is already cancelled');
    }

    listing.status = ListingStatus.CANCELLED;
    const saved = await this.listingRepo.save(listing);
    this.logger.log(`Listing cancelled: ${id}`);
    return saved;
  }

  // ═════════════════════════════════════════════════════════════
  // TRADING  —  Atomic Swap via Algorand group transactions
  // ═════════════════════════════════════════════════════════════

  /**
   * STEP 1: Prepare Buy
   * Builds an atomic transaction group:
   *   Txn 0 — Buyer pays ALGO to Seller (seller proceeds)
   *   Txn 1 — Buyer pays platform fee in ALGO (if applicable)
   *   Txn 2 — Admin (clawback/escrow) transfers ASA from Seller to Buyer
   *
   * Only buyer-signable txns (0 & 1) are returned unsigned for client signing.
   * Txn 2 is signed server-side by the admin in confirmBuy.
   */
  async prepareBuy(dto: PrepareBuyDto): Promise<{
    tradeId: string;
    unsignedTxns: string[];
    buyerSignIndices: number[];
    summary: {
      units: number;
      pricePerUnit: number;
      subtotal: number;
      platformFee: number;
      totalCost: number;
      sellerProceeds: number;
    };
  }> {
    const listing = await this.findOne(dto.listingId);

    // Validations
    if (listing.status !== ListingStatus.ACTIVE && listing.status !== ListingStatus.PARTIAL) {
      throw new BadRequestException('This listing is no longer available');
    }
    if (dto.units < listing.minPurchase) {
      throw new BadRequestException(`Minimum purchase is ${listing.minPurchase} units`);
    }
    if (dto.units > listing.remainingQuantity) {
      throw new BadRequestException(
        `Only ${listing.remainingQuantity} units remaining. You requested ${dto.units}`,
      );
    }
    if (dto.buyerAddress === listing.sellerAddress) {
      throw new BadRequestException('You cannot buy your own listing');
    }
    if (listing.expiresAt && new Date(listing.expiresAt) < new Date()) {
      listing.status = ListingStatus.EXPIRED;
      await this.listingRepo.save(listing);
      throw new BadRequestException('This listing has expired');
    }

    // Calculate amounts (in microAlgos)
    const pricePerUnitMicro = Math.round(Number(listing.pricePerUnit) * 1_000_000);
    const subtotalMicro = pricePerUnitMicro * dto.units;
    const platformFeeMicro = Math.round((subtotalMicro * listing.platformFeeBps) / 10_000);
    const sellerProceedsMicro = subtotalMicro - platformFeeMicro;

    const adminAddress = this.config.get<string>('algorand.admin.address');
    const feeRecipient = adminAddress || listing.sellerAddress;

    // Build atomic group
    const params = await this.algorand.getSuggestedParams();
    const network = this.algorand.getNetwork();

    const txns: algosdk.Transaction[] = [];
    const buyerSignIndices: number[] = [];

    // Txn 0: Buyer → Seller (ALGO payment, seller proceeds)
    txns.push(
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: dto.buyerAddress,
        receiver: listing.sellerAddress,
        amount: BigInt(sellerProceedsMicro),
        suggestedParams: params,
        note: new TextEncoder().encode(`AssetLinked marketplace: buy ${dto.units} ${listing.unitName}`),
      }),
    );
    buyerSignIndices.push(0);

    // Txn 1: Buyer → Platform (fee payment)
    if (platformFeeMicro > 0 && feeRecipient !== listing.sellerAddress) {
      txns.push(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: dto.buyerAddress,
          receiver: feeRecipient,
          amount: BigInt(platformFeeMicro),
          suggestedParams: params,
          note: new TextEncoder().encode('AssetLinked platform fee'),
        }),
      );
      buyerSignIndices.push(1);
    }

    // Txn 2: Admin (escrow) → Buyer (ASA clawback transfer from seller)
    // Uses admin as sender with assetSender (clawback) to pull ASA from seller
    if (adminAddress) {
      txns.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: adminAddress,
          receiver: dto.buyerAddress,
          amount: BigInt(dto.units),
          assetIndex: Number(listing.asaId),
          suggestedParams: params,
          note: new TextEncoder().encode(`AssetLinked: transfer ${dto.units} ${listing.unitName}`),
          assetSender: listing.sellerAddress, // clawback from seller
        }),
      );
    } else {
      // Fallback: if no admin, make seller the sender (requires seller to co-sign)
      txns.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: listing.sellerAddress,
          receiver: dto.buyerAddress,
          amount: BigInt(dto.units),
          assetIndex: Number(listing.asaId),
          suggestedParams: params,
          note: new TextEncoder().encode(`AssetLinked: transfer ${dto.units} ${listing.unitName}`),
        }),
      );
    }

    // Assign group ID (make atomic)
    algosdk.assignGroupID(txns);

    // Encode ALL txns to base64 (stored in trade record for confirmBuy)
    const allUnsignedTxns = txns.map((txn) => {
      const encoded = algosdk.encodeUnsignedTransaction(txn);
      return Buffer.from(encoded).toString('base64');
    });

    // Only return buyer-signable txns to the client
    const buyerUnsignedTxns = buyerSignIndices.map(i => allUnsignedTxns[i]);

    // Create trade record (store ALL unsigned txns for server-side signing later)
    const trade = this.tradeRepo.create({
      listingId: listing.id,
      asaId: listing.asaId,
      buyerAddress: dto.buyerAddress,
      sellerAddress: listing.sellerAddress,
      units: dto.units,
      pricePerUnit: listing.pricePerUnit,
      totalAlgo: subtotalMicro,
      platformFee: platformFeeMicro,
      sellerProceeds: sellerProceedsMicro,
      unsignedTxns: JSON.stringify(allUnsignedTxns),
      status: TradeStatus.PENDING,
      network,
    });
    const savedTrade = await this.tradeRepo.save(trade);

    return {
      tradeId: savedTrade.id,
      unsignedTxns: buyerUnsignedTxns,
      buyerSignIndices,
      summary: {
        units: dto.units,
        pricePerUnit: Number(listing.pricePerUnit),
        subtotal: subtotalMicro / 1_000_000,
        platformFee: platformFeeMicro / 1_000_000,
        totalCost: (sellerProceedsMicro + platformFeeMicro) / 1_000_000,
        sellerProceeds: sellerProceedsMicro / 1_000_000,
      },
    };
  }

  /**
   * STEP 2: Confirm Buy
   * Receives buyer-signed txns, server-signs the admin escrow txn,
   * combines all, submits to Algorand, and updates records.
   */
  async confirmBuy(dto: ConfirmBuyDto): Promise<{
    trade: MarketplaceTrade;
    listing: MarketplaceListing;
    explorerUrl: string;
  }> {
    const trade = await this.tradeRepo.findOne({ where: { id: dto.tradeId } });
    if (!trade) throw new NotFoundException(`Trade ${dto.tradeId} not found`);
    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException(`Trade is ${trade.status}, expected pending`);
    }

    const listing = await this.findOne(trade.listingId);

    try {
      // Restore ALL unsigned txns from the trade record
      if (!trade.unsignedTxns) {
        throw new BadRequestException('Trade has no unsigned transactions stored');
      }
      const allUnsignedB64: string[] = JSON.parse(trade.unsignedTxns);
      const adminMnemonic = this.config.get<string>('algorand.admin.mnemonic') || '';

      // Determine how many buyer txns vs server txns
      // Buyer signs txns 0..N-1, server signs last txn (ASA transfer)
      const buyerSignedCount = dto.signedTxns.length;
      const serverSignCount = allUnsignedB64.length - buyerSignedCount;

      const signedTxnParts: Uint8Array[] = [];

      // 1) Add buyer-signed txns
      for (const b64 of dto.signedTxns) {
        signedTxnParts.push(Uint8Array.from(Buffer.from(b64, 'base64')));
      }

      // 2) Server-sign remaining txns (ASA transfer by admin)
      if (serverSignCount > 0 && adminMnemonic) {
        const adminAccount = algosdk.mnemonicToSecretKey(adminMnemonic);
        for (let i = buyerSignedCount; i < allUnsignedB64.length; i++) {
          const txnBytes = Uint8Array.from(Buffer.from(allUnsignedB64[i], 'base64'));
          const txn = algosdk.decodeUnsignedTransaction(txnBytes);
          const signed = txn.signTxn(adminAccount.sk);
          signedTxnParts.push(signed);
        }
      } else if (serverSignCount > 0) {
        throw new BadRequestException(
          'Server cannot sign escrow transaction — admin mnemonic not configured',
        );
      }

      // Submit atomic group
      const algod = this.algorand.getAlgodClient();
      const { txid } = await algod.sendRawTransaction(signedTxnParts).do();

      // Wait for confirmation (up to 4 rounds)
      const confirmed = await algosdk.waitForConfirmation(algod, txid, 4);
      const confirmedRound = Number(confirmed['confirmed-round'] || 0);

      // Update trade
      trade.groupTxId = txid;
      trade.paymentTxId = txid;
      trade.confirmedRound = confirmedRound;
      trade.status = TradeStatus.CONFIRMED;
      await this.tradeRepo.save(trade);

      // Update listing quantities
      listing.remainingQuantity = Number(listing.remainingQuantity) - trade.units;
      if (listing.remainingQuantity <= 0) {
        listing.status = ListingStatus.FILLED;
        listing.buyerAddress = trade.buyerAddress;
      } else {
        listing.status = ListingStatus.PARTIAL;
      }
      await this.listingRepo.save(listing);

      const explorerUrl = this.algorand.getExplorerTxUrl(txid);
      this.logger.log(
        `Trade confirmed: ${trade.id} — ${trade.units} units of ASA ${trade.asaId} ` +
        `@ round ${confirmedRound} — ${explorerUrl}`,
      );

      return { trade, listing, explorerUrl };
    } catch (err: any) {
      trade.status = TradeStatus.FAILED;
      await this.tradeRepo.save(trade);
      this.logger.error(`Trade failed: ${trade.id} — ${err.message}`);
      throw new BadRequestException(`Transaction failed: ${err.message}`);
    }
  }

  // ═════════════════════════════════════════════════════════════
  // STATS & HISTORY
  // ═════════════════════════════════════════════════════════════

  async getStats(): Promise<{
    totalListings: number;
    activeListings: number;
    totalTrades: number;
    totalVolumeMicro: number;
    totalVolumeAlgo: number;
    totalFeesMicro: number;
    uniqueSellers: number;
    uniqueBuyers: number;
  }> {
    const totalListings = await this.listingRepo.count();
    const activeListings = await this.listingRepo.count({
      where: { status: In([ListingStatus.ACTIVE, ListingStatus.PARTIAL]) },
    });
    const totalTrades = await this.tradeRepo.count({
      where: { status: TradeStatus.CONFIRMED },
    });

    const volumeResult = await this.tradeRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.totalAlgo), 0)', 'volume')
      .addSelect('COALESCE(SUM(t.platformFee), 0)', 'fees')
      .where('t.status = :status', { status: TradeStatus.CONFIRMED })
      .getRawOne();

    const sellersResult = await this.listingRepo
      .createQueryBuilder('l')
      .select('COUNT(DISTINCT l.sellerAddress)', 'count')
      .getRawOne();

    const buyersResult = await this.tradeRepo
      .createQueryBuilder('t')
      .select('COUNT(DISTINCT t.buyerAddress)', 'count')
      .where('t.status = :status', { status: TradeStatus.CONFIRMED })
      .getRawOne();

    const totalVolumeMicro = parseInt(volumeResult?.volume || '0', 10);
    const totalFeesMicro = parseInt(volumeResult?.fees || '0', 10);

    return {
      totalListings,
      activeListings,
      totalTrades,
      totalVolumeMicro,
      totalVolumeAlgo: totalVolumeMicro / 1_000_000,
      totalFeesMicro,
      uniqueSellers: parseInt(sellersResult?.count || '0', 10),
      uniqueBuyers: parseInt(buyersResult?.count || '0', 10),
    };
  }

  /** Get trade history for an address (as buyer or seller) */
  async getTradeHistory(address: string, limit = 50): Promise<MarketplaceTrade[]> {
    return this.tradeRepo
      .createQueryBuilder('t')
      .where('t.buyerAddress = :addr OR t.sellerAddress = :addr', { addr: address })
      .andWhere('t.status = :status', { status: TradeStatus.CONFIRMED })
      .orderBy('t.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /** Get recent trades (global feed) */
  async getRecentTrades(limit = 20): Promise<MarketplaceTrade[]> {
    return this.tradeRepo.find({
      where: { status: TradeStatus.CONFIRMED },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
