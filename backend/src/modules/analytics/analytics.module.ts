import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AssetsModule } from '../assets/assets.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { GovernanceModule } from '../governance/governance.module';

@Module({
  imports: [AssetsModule, MarketplaceModule, GovernanceModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
