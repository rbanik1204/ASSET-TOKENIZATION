import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Asset, VerificationStatus } from './entities/asset.entity';
import { Transaction } from './entities/transaction.entity';
import { AssetHolder } from './entities/asset-holder.entity';
import { MarketplaceListing, ListingStatus, ListingType } from '../marketplace/entities/listing.entity';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { VerifyAssetDto } from './dto/create-asset.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(AssetHolder)
    private readonly holderRepo: Repository<AssetHolder>,
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** List assets with pagination and optional filtering */
  async findAll(
    pagination: PaginationDto,
    filters?: {
      category?: string;
      status?: VerificationStatus;
      network?: string;
      ownerAddress?: string;
    },
  ): Promise<PaginatedResponseDto<Asset>> {
    const { page, limit } = pagination;
    const qb = this.assetRepo.createQueryBuilder('asset');

    if (filters?.category) {
      qb.andWhere('asset.category = :category', { category: filters.category });
    }
    if (filters?.status) {
      qb.andWhere('asset.verificationStatus = :status', { status: filters.status });
    }
    if (filters?.network) {
      qb.andWhere('asset.asaNetwork = :network', { network: filters.network });
    }
    if (filters?.ownerAddress) {
      qb.andWhere('asset.ownerAddress = :owner', { owner: filters.ownerAddress });
    }

    qb.orderBy('asset.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /** Get single asset by ID */
  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  /** Get asset by ASA ID */
  async findByAsaId(asaId: number): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { asaId } });
    if (!asset) throw new NotFoundException(`Asset with ASA ID ${asaId} not found`);
    return asset;
  }

  /** Create a new asset record */
  async create(data: Partial<Asset>): Promise<Asset> {
    const asset = this.assetRepo.create(data);
    const saved = await this.assetRepo.save(asset);
    this.logger.log(`Asset created: ${saved.id} — ${saved.name}`);
    return saved;
  }

  /** Update an asset */
  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    const asset = await this.findOne(id);
    Object.assign(asset, data);
    return this.assetRepo.save(asset);
  }

  /** Record a transaction */
  async recordTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const tx = this.txRepo.create(data);
    return this.txRepo.save(tx);
  }

  /** Get transactions for an asset */
  async getTransactions(
    assetId?: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponseDto<Transaction>> {
    const { page = 1, limit = 20 } = pagination || {};
    const qb = this.txRepo.createQueryBuilder('tx');

    if (assetId) {
      qb.andWhere('tx.assetId = :assetId', { assetId });
    }

    qb.orderBy('tx.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  /** Get holder count for an asset */
  async getHolderCount(asaId: number): Promise<number> {
    return this.holderRepo.count({ where: { asaId, optedIn: true } });
  }

  /** Get platform-wide stats */
  async getStats() {
    const totalAssets = await this.assetRepo.count();
    const verifiedAssets = await this.assetRepo.count({
      where: { verificationStatus: VerificationStatus.APPROVED },
    });
    const pendingAssets = await this.assetRepo.count({
      where: { verificationStatus: VerificationStatus.PENDING },
    });
    const totalTransactions = await this.txRepo.count();
    const uniqueHolders = await this.holderRepo
      .createQueryBuilder('holder')
      .select('COUNT(DISTINCT holder.holderAddress)', 'count')
      .getRawOne();

    return {
      totalAssets,
      verifiedAssets,
      pendingAssets,
      totalTransactions,
      uniqueHolders: parseInt(uniqueHolders?.count || '0', 10),
    };
  }

  /** Get all assets pending admin review (with supporting documents) */
  async getPendingReview() {
    const assets = await this.assetRepo.find({
      where: { verificationStatus: VerificationStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    return assets.map(a => ({
      id: a.id,
      name: a.name,
      unitName: a.unitName,
      description: a.description,
      category: a.category,
      totalSupply: a.totalSupply,
      decimals: a.decimals,
      pricePerUnit: a.pricePerUnit,
      currency: a.currency,
      asaId: a.asaId,
      asaCreator: a.asaCreator,
      ownerAddress: a.ownerAddress,
      tokenizationStatus: a.tokenizationStatus,
      verificationStatus: a.verificationStatus,
      supportingDocuments: a.supportingDocuments || [],
      ipfsCid: a.ipfsCid,
      createdAt: a.createdAt,
    }));
  }

  /** Admin approve or reject an asset after document review */
  async verifyAsset(dto: VerifyAssetDto) {
    // ── Admin-only guard ──────────────────────────────────────
    const adminAddress = this.config.get<string>('algorand.admin.address');
    if (adminAddress && dto.reviewerAddress !== adminAddress) {
      throw new ForbiddenException(
        'Only the platform admin wallet can approve or reject assets. ' +
        `Expected: ${adminAddress.slice(0, 8)}...${adminAddress.slice(-4)}`,
      );
    }

    const asset = await this.assetRepo.findOne({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException(`Asset ${dto.assetId} not found`);

    if (asset.verificationStatus !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        `Asset is already ${asset.verificationStatus}. Cannot change status.`,
      );
    }

    asset.verificationStatus = dto.approve
      ? VerificationStatus.APPROVED
      : VerificationStatus.REJECTED;
    asset.verificationDate = new Date();
    asset.adminReviewNote = dto.reason || '';
    asset.reviewedBy = dto.reviewerAddress;

    const saved = await this.assetRepo.save(asset);
    this.logger.log(
      `Asset ${saved.id} (${saved.name}) ${dto.approve ? 'APPROVED' : 'REJECTED'} by ${dto.reviewerAddress}`,
    );

    // ── Auto-list approved assets on marketplace ──────────────
    let listingId: string | null = null;
    if (dto.approve && saved.asaId && saved.ownerAddress) {
      try {
        // Check for existing active listing
        const existing = await this.listingRepo.findOne({
          where: {
            asaId: saved.asaId,
            status: In([ListingStatus.ACTIVE, ListingStatus.PARTIAL]),
          },
        });

        if (!existing) {
          const listing = this.listingRepo.create({
            assetId: saved.id,
            asaId: saved.asaId,
            assetName: saved.name,
            unitName: saved.unitName,
            category: saved.category || null,
            sellerAddress: saved.ownerAddress,
            pricePerUnit: saved.pricePerUnit || 1,
            originalQuantity: saved.totalSupply,
            remainingQuantity: saved.totalSupply,
            minPurchase: 1,
            platformFeeBps: 250,
            description: saved.description || null,
            status: ListingStatus.ACTIVE,
            listingType: ListingType.SELL,
          });
          const savedListing = await this.listingRepo.save(listing);
          listingId = savedListing.id;
          this.logger.log(
            `Auto-listed asset ${saved.name} on marketplace: ${savedListing.id} ` +
            `— ${saved.totalSupply} units @ ${saved.pricePerUnit || 1} ALGO`,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Auto-listing failed for ${saved.id}: ${err.message}`);
      }
    }

    // ── Notify the asset owner ────────────────────────────────
    try {
      if (saved.ownerAddress) {
        await this.notificationsService.create({
          walletAddress: saved.ownerAddress,
          type: dto.approve ? 'income' : 'alert',
          title: dto.approve ? 'Asset Approved & Listed!' : 'Asset Rejected',
          message: dto.approve
            ? `Your asset "${saved.name}" has been approved by admin and is now listed on the marketplace. Buyers can purchase your tokens with ALGO.`
            : `Your asset "${saved.name}" was rejected. Reason: ${dto.reason || 'Not specified'}`,
          actionUrl: dto.approve ? '/marketplace' : '/tokenize',
          network: 'testnet',
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to notify owner: ${err.message}`);
    }

    return {
      success: true,
      id: saved.id,
      name: saved.name,
      verificationStatus: saved.verificationStatus,
      reviewedBy: saved.reviewedBy,
      listingId,
      message: dto.approve
        ? `Asset approved and ${listingId ? 'auto-listed on marketplace' : 'ready for marketplace'}`
        : 'Asset rejected',
    };
  }
}
