import { Controller, Get, Post, Body, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreateListingDto, PrepareBuyDto, ConfirmBuyDto,
  CancelListingDto, ListingFiltersDto,
} from './dto/marketplace.dto';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // ── LISTINGS ──────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'List marketplace listings with pagination & filters' })
  @ApiResponse({ status: 200, description: 'Paginated listing list' })
  findAll(@Query() pagination: PaginationDto, @Query() filters: ListingFiltersDto) {
    return this.marketplaceService.findAll(pagination, filters);
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get marketplace statistics' })
  getStats() {
    return this.marketplaceService.getStats();
  }

  @Public()
  @Get('trades/recent')
  @ApiOperation({ summary: 'Get recent trades (global feed)' })
  getRecentTrades(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.marketplaceService.getRecentTrades(limit);
  }

  @Public()
  @Get('trades/:address')
  @ApiOperation({ summary: 'Get trade history for an address' })
  getTradeHistory(
    @Param('address') address: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.marketplaceService.getTradeHistory(address, limit);
  }

  @Public()
  @Get('seller/:address')
  @ApiOperation({ summary: 'Get listings by seller address' })
  findBySeller(@Param('address') address: string) {
    return this.marketplaceService.findBySeller(address);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({ status: 200, description: 'Listing returned' })
  findOne(@Param('id') id: string) {
    return this.marketplaceService.findOne(id);
  }

  // ── CREATE / CANCEL ──────────────────────────────

  @Public()
  @Post('create')
  @ApiOperation({ summary: 'Create a new marketplace listing' })
  @ApiResponse({ status: 201, description: 'Listing created' })
  createListing(@Body() dto: CreateListingDto) {
    return this.marketplaceService.createListing(dto);
  }

  @Public()
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a listing (seller only)' })
  cancelListing(@Param('id') id: string, @Body() dto: CancelListingDto) {
    return this.marketplaceService.cancelListing(id, dto.sellerAddress);
  }

  // ── ATOMIC SWAP BUY FLOW ─────────────────────────

  @Public()
  @Post('buy/prepare')
  @ApiOperation({ summary: 'Step 1: Prepare atomic swap (returns unsigned txns)' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction group returned' })
  prepareBuy(@Body() dto: PrepareBuyDto) {
    return this.marketplaceService.prepareBuy(dto);
  }

  @Public()
  @Post('buy/confirm')
  @ApiOperation({ summary: 'Step 2: Submit signed transaction group to Algorand' })
  @ApiResponse({ status: 200, description: 'Trade confirmed on-chain' })
  confirmBuy(@Body() dto: ConfirmBuyDto) {
    return this.marketplaceService.confirmBuy(dto);
  }
}
