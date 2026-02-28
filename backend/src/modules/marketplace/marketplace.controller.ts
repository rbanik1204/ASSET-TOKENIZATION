import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ListingStatus } from './entities/listing.entity';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List marketplace listings with pagination' })
  @ApiQuery({ name: 'status', required: false, enum: ListingStatus })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiResponse({ status: 200, description: 'Paginated listing list' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: ListingStatus,
    @Query('assetId') assetId?: string,
  ) {
    return this.marketplaceService.findAll(pagination, { status, assetId });
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get marketplace statistics' })
  getStats() {
    return this.marketplaceService.getStats();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({ status: 200, description: 'Listing returned' })
  findOne(@Param('id') id: string) {
    return this.marketplaceService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new listing (auth required)' })
  @ApiResponse({ status: 201, description: 'Listing created' })
  create(@Body() body: any) {
    return this.marketplaceService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a listing (auth required)' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.marketplaceService.update(id, body);
  }
}
