import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { VerificationStatus } from './entities/asset.entity';
import { Public, Roles } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all assets with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false, enum: VerificationStatus })
  @ApiQuery({ name: 'network', required: false })
  @ApiQuery({ name: 'ownerAddress', required: false })
  @ApiResponse({ status: 200, description: 'Paginated asset list' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('category') category?: string,
    @Query('status') status?: VerificationStatus,
    @Query('network') network?: string,
    @Query('ownerAddress') ownerAddress?: string,
  ) {
    return this.assetsService.findAll(pagination, { category, status, network, ownerAddress });
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide asset statistics' })
  @ApiResponse({ status: 200, description: 'Platform stats returned' })
  getStats() {
    return this.assetsService.getStats();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset returned' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Public()
  @Get('asa/:asaId')
  @ApiOperation({ summary: 'Get asset by Algorand ASA ID' })
  @ApiResponse({ status: 200, description: 'Asset returned' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  findByAsaId(@Param('asaId') asaId: number) {
    return this.assetsService.findByAsaId(asaId);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.ASSET_ISSUER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new asset (asset_issuer or admin)' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  create(@Body() body: any) {
    return this.assetsService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.assetsService.update(id, body);
  }

  @Public()
  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get transactions for an asset' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated transactions' })
  getTransactions(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.assetsService.getTransactions(undefined, pagination);
  }
}
