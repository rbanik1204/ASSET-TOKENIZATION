import { Injectable, Logger } from '@nestjs/common';
import { AssetsService } from '../assets/assets.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { GovernanceService } from '../governance/governance.service';
import { AlgorandService } from '../wallet/services/algorand.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly assetsService: AssetsService,
    private readonly marketplaceService: MarketplaceService,
    private readonly governanceService: GovernanceService,
    private readonly algorandService: AlgorandService,
  ) {}

  /** Aggregated platform overview */
  async getPlatformOverview() {
    const [assetStats, marketStats, govStats] = await Promise.all([
      this.assetsService.getStats(),
      this.marketplaceService.getStats(),
      this.governanceService.getStats(),
    ]);

    return {
      assets: assetStats,
      marketplace: marketStats,
      governance: govStats,
      network: {
        name: this.algorandService.getNetwork(),
        isMainnet: this.algorandService.isMainnet(),
        healthy: await this.algorandService.isHealthy(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /** Asset category distribution */
  async getCategoryDistribution() {
    const result = await this.assetsService.findAll(
      { page: 1, limit: 1000 },
    );
    const distribution: Record<string, number> = {};
    result.data.forEach(asset => {
      const cat = asset.category || 'other';
      distribution[cat] = (distribution[cat] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }

  /** Verification breakdown */
  async getVerificationBreakdown() {
    const stats = await this.assetsService.getStats();
    return [
      { name: 'Approved', value: stats.verifiedAssets },
      { name: 'Pending', value: stats.pendingAssets },
      { name: 'Rejected', value: stats.totalAssets - stats.verifiedAssets - stats.pendingAssets },
    ].filter(i => i.value > 0);
  }

  /** Network health check */
  async getNetworkHealth() {
    try {
      const status = await this.algorandService.getStatus();
      return {
        healthy: true,
        lastRound: status['last-round'],
        catchupTime: status['catchup-time'],
        network: this.algorandService.getNetwork(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        network: this.algorandService.getNetwork(),
      };
    }
  }
}
