import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Analytics')
@Public()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform overview — all modules aggregated' })
  @ApiResponse({ status: 200, description: 'Platform overview returned' })
  async getOverview() {
    return this.analyticsService.getPlatformOverview();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Asset category distribution' })
  @ApiResponse({ status: 200, description: 'Category distribution returned' })
  async getCategories() {
    return this.analyticsService.getCategoryDistribution();
  }

  @Get('verification')
  @ApiOperation({ summary: 'Verification status breakdown' })
  @ApiResponse({ status: 200, description: 'Verification breakdown returned' })
  async getVerification() {
    return this.analyticsService.getVerificationBreakdown();
  }

  @Get('network')
  @ApiOperation({ summary: 'Algorand network health' })
  @ApiResponse({ status: 200, description: 'Network health returned' })
  async getNetworkHealth() {
    return this.analyticsService.getNetworkHealth();
  }
}
