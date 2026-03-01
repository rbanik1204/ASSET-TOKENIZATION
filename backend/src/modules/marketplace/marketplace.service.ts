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
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly notificationsService: NotificationsService,
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

    // Gate: asset must be admin-approved before listing
    if (asset.verificationStatus !== 'approved') {
      throw new ForbiddenException(
        'Asset must be approved by admin before it can be listed on the marketplace. ' +
        `Current status: ${asset.verificationStatus}`,
      );
    }

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
  // ESCROW SETUP — Set ASA clawback to admin for marketplace trades
  // ═════════════════════════════════════════════════════════════

  /**
   * Generates an unsigned ASA Config txn that sets the clawback address
   * to the platform admin. The seller must sign this once per ASA.
   */
  async prepareEscrowSetup(listingId: string, sellerAddress: string): Promise<{
    unsignedTxn: string;
    asaId: number;
    message: string;
  }> {
    const listing = await this.findOne(listingId);
    if (listing.sellerAddress !== sellerAddress) {
      throw new ForbiddenException('Only the seller can set up escrow');
    }

    const adminAddress = this.config.get<string>('algorand.admin.address');
    if (!adminAddress) {
      throw new BadRequestException('Admin address not configured');
    }

    // Check if clawback is already admin
    try {
      const asaInfo = await this.algorand.getAssetInfo(Number(listing.asaId));
      const assetParams = asaInfo?.asset?.params || asaInfo?.params || asaInfo;
      const currentClawback = assetParams?.clawback || assetParams?.['clawback-addr'];
      if (currentClawback === adminAddress) {
        return {
          unsignedTxn: '',
          asaId: Number(listing.asaId),
          message: 'Escrow already configured — clawback is set to admin',
        };
      }
    } catch { /* continue */ }

    const params = await this.algorand.getSuggestedParams();

    // ASA Config txn: change clawback to admin
    const txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
      sender: sellerAddress,
      assetIndex: Number(listing.asaId),
      suggestedParams: params,
      // Must preserve existing manager/reserve/freeze or they get cleared
      manager: sellerAddress,
      reserve: sellerAddress,
      freeze: sellerAddress,
      clawback: adminAddress,
      note: new TextEncoder().encode('AssetLinked: setup marketplace escrow'),
      strictEmptyAddressChecking: false,
    });

    const unsignedTxnB64 = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');

    return {
      unsignedTxn: unsignedTxnB64,
      asaId: Number(listing.asaId),
      message: `Sign this transaction to authorize the platform to facilitate trades for ASA #${listing.asaId}`,
    };
  }

  /**
   * Confirm escrow setup — submit the seller-signed ASA Config txn
   */
  async confirmEscrowSetup(listingId: string, signedTxn: string): Promise<{ success: boolean; txId: string }> {
    const signedTxnBytes = Uint8Array.from(Buffer.from(signedTxn, 'base64'));
    const algod = this.algorand.getAlgodClient();

    const { txid } = await algod.sendRawTransaction(signedTxnBytes).do();
    await algosdk.waitForConfirmation(algod, txid, 4);

    this.logger.log(`Escrow setup confirmed for listing ${listingId}: ${txid}`);
    return { success: true, txId: txid };
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

    // Txn 2: ASA transfer from seller to buyer
    // Look up on-chain ASA info to determine who has clawback authority
    let asaClawbackAddr: string | null = null;
    try {
      const asaInfo = await this.algorand.getAssetInfo(Number(listing.asaId));
      const assetParams = asaInfo?.asset?.params || asaInfo?.params || asaInfo;
      asaClawbackAddr = assetParams?.clawback || assetParams?.['clawback-addr'] || null;
      this.logger.log(`ASA #${listing.asaId} on-chain clawback: ${asaClawbackAddr}`);
    } catch (err: any) {
      this.logger.warn(`Could not look up ASA #${listing.asaId} info: ${err.message}`);
    }

    // ── Check if buyer has opted in to the ASA ──────────────────
    let buyerNeedsOptIn = true;
    try {
      const buyerAcct = await this.algorand.getAccountInfo(dto.buyerAddress);
      const buyerAssets = buyerAcct?.assets || buyerAcct?.['created-assets'] || [];
      buyerNeedsOptIn = !buyerAssets.some(
        (a: any) => Number(a['asset-id']) === Number(listing.asaId),
      );
    } catch {
      // Account might not exist yet — assume needs opt-in
      buyerNeedsOptIn = true;
    }

    // Txn N: Buyer opts in to ASA (if not already opted in)
    if (buyerNeedsOptIn) {
      const optInIndex = txns.length;
      txns.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: dto.buyerAddress,
          receiver: dto.buyerAddress,
          amount: BigInt(0),
          assetIndex: Number(listing.asaId),
          suggestedParams: params,
          note: new TextEncoder().encode(`Opt-in to ASA #${listing.asaId}`),
        }),
      );
      buyerSignIndices.push(optInIndex);
      this.logger.log(`Buyer ${dto.buyerAddress} needs opt-in to ASA #${listing.asaId} — added txn at index ${optInIndex}`);
    }

    if (adminAddress && asaClawbackAddr === adminAddress) {
      // Admin IS the clawback — use clawback transfer (server-signed)
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
      // Server signs this txn — don't add to buyerSignIndices
    } else {
      // Clawback is NOT the admin — escrow setup is required first
      throw new BadRequestException(
        'ESCROW_REQUIRED: The seller must enable marketplace trading for this asset before it can be purchased. ' +
        'The seller should click "Enable Trading" on their listing.',
      );
    }

    // Assign group ID (make atomic)
    algosdk.assignGroupID(txns);

    // Encode ALL txns to base64 (stored in trade record for confirmBuy)
    const allUnsignedTxns = txns.map((txn) => {
      const encoded = algosdk.encodeUnsignedTransaction(txn);
      return Buffer.from(encoded).toString('base64');
    });

    this.logger.log(`prepareBuy: ${txns.length} txns, buyerSignIndices=${JSON.stringify(buyerSignIndices)}`);

    // Return ALL txns to client (Pera requires full group)
    // buyerSignIndices tells client which ones the buyer signs

    // Create trade record (store ALL unsigned txns + buyerSignIndices for confirmBuy)
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
      buyerSignIndicesJson: JSON.stringify(buyerSignIndices),
      status: TradeStatus.PENDING,
      network,
    });
    const savedTrade = await this.tradeRepo.save(trade);

    return {
      tradeId: savedTrade.id,
      unsignedTxns: allUnsignedTxns,
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
      // Restore ALL unsigned txns and buyer sign indices from the trade record
      if (!trade.unsignedTxns) {
        throw new BadRequestException('Trade has no unsigned transactions stored');
      }
      const allUnsignedB64: string[] = JSON.parse(trade.unsignedTxns);
      const storedBuyerIndices: number[] = trade.buyerSignIndicesJson
        ? JSON.parse(trade.buyerSignIndicesJson)
        : [];
      const adminMnemonic = this.config.get<string>('algorand.admin.mnemonic') || '';
      const buyerIndicesSet = new Set(storedBuyerIndices);

      this.logger.log(
        `confirmBuy: ${allUnsignedB64.length} total txns, buyerIndices=${JSON.stringify(storedBuyerIndices)}, ` +
        `received ${dto.signedTxns.length} buyer-signed txns`,
      );

      // Build the fully-signed transaction array in order
      const signedTxnParts: Uint8Array[] = [];
      let buyerSignedIdx = 0;

      const adminAccount = adminMnemonic ? algosdk.mnemonicToSecretKey(adminMnemonic) : null;

      for (let i = 0; i < allUnsignedB64.length; i++) {
        if (buyerIndicesSet.has(i)) {
          // Buyer-signed txn
          if (buyerSignedIdx >= dto.signedTxns.length) {
            throw new BadRequestException(`Missing buyer-signed txn at index ${i}`);
          }
          signedTxnParts.push(Uint8Array.from(Buffer.from(dto.signedTxns[buyerSignedIdx], 'base64')));
          buyerSignedIdx++;
        } else {
          // Server-signed txn
          if (!adminAccount) {
            throw new BadRequestException(
              'Server cannot sign escrow transaction — admin mnemonic not configured',
            );
          }
          const txnBytes = Uint8Array.from(Buffer.from(allUnsignedB64[i], 'base64'));
          const txn = algosdk.decodeUnsignedTransaction(txnBytes);
          const signed = txn.signTxn(adminAccount.sk);
          signedTxnParts.push(signed);
        }
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

      // ── Notify seller (asset owner) about the sale ─────────
      try {
        const sellerProceedsAlgo = (trade.sellerProceeds / 1_000_000).toFixed(4);
        await this.notificationsService.create({
          walletAddress: trade.sellerAddress,
          type: 'purchase',
          title: '💰 Token Sale — ALGO Credited!',
          message: `${trade.units} unit(s) of ${listing.assetName} (${listing.unitName}) sold to ${trade.buyerAddress.slice(0, 8)}...${trade.buyerAddress.slice(-4)}. ` +
            `You received ${sellerProceedsAlgo} ALGO (after 2.5% platform fee). ` +
            `Transaction confirmed at round ${confirmedRound}.`,
          txId: txid,
          network: trade.network || 'testnet',
          actionUrl: '/portfolio',
        });
      } catch (notifErr: any) {
        this.logger.warn(`Failed to notify seller: ${notifErr.message}`);
      }

      // ── Notify buyer about successful purchase ─────────
      try {
        const totalCostAlgo = ((trade.sellerProceeds + trade.platformFee) / 1_000_000).toFixed(4);
        await this.notificationsService.create({
          walletAddress: trade.buyerAddress,
          type: 'purchase',
          title: '✅ Purchase Confirmed!',
          message: `You purchased ${trade.units} unit(s) of ${listing.assetName} (${listing.unitName}) for ${totalCostAlgo} ALGO. ` +
            `Transaction confirmed at round ${confirmedRound}.`,
          txId: txid,
          network: trade.network || 'testnet',
          actionUrl: '/portfolio',
        });
      } catch (notifErr: any) {
        this.logger.warn(`Failed to notify buyer: ${notifErr.message}`);
      }

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
