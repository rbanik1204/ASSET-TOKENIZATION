import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceListing, ListingStatus } from './entities/listing.entity';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
  ) {}

  async findAll(
    pagination: PaginationDto,
    filters?: { status?: ListingStatus; assetId?: string },
  ): Promise<PaginatedResponseDto<MarketplaceListing>> {
    const { page, limit } = pagination;
    const qb = this.listingRepo.createQueryBuilder('listing');

    if (filters?.status) {
      qb.andWhere('listing.status = :status', { status: filters.status });
    }
    if (filters?.assetId) {
      qb.andWhere('listing.assetId = :assetId', { assetId: filters.assetId });
    }

    qb.orderBy('listing.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async findOne(id: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  async create(data: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
    const listing = this.listingRepo.create(data);
    return this.listingRepo.save(listing);
  }

  async update(id: string, data: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
    const listing = await this.findOne(id);
    Object.assign(listing, data);
    return this.listingRepo.save(listing);
  }

  async getStats() {
    const totalListings = await this.listingRepo.count();
    const activeListings = await this.listingRepo.count({ where: { status: ListingStatus.ACTIVE } });
    const totalSold = await this.listingRepo.count({ where: { status: ListingStatus.SOLD } });

    const volumeResult = await this.listingRepo
      .createQueryBuilder('listing')
      .select('SUM(listing.totalPrice)', 'volume')
      .where('listing.status = :status', { status: ListingStatus.SOLD })
      .getRawOne();

    return {
      totalListings,
      activeListings,
      totalSold,
      totalVolume: parseFloat(volumeResult?.volume || '0'),
    };
  }
}
