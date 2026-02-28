import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, VerificationStatus } from './entities/asset.entity';
import { Transaction } from './entities/transaction.entity';
import { AssetHolder } from './entities/asset-holder.entity';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

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
}
