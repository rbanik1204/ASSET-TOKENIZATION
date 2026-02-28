import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { AlgorandService } from '../wallet/services/algorand.service';
import { StorageService } from '../storage/storage.service';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly algorandService: AlgorandService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Platform health check — DB, Algorand, IPFS' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // PostgreSQL
      () => this.db.pingCheck('database'),

      // Algorand node
      async () => {
        const healthy = await this.algorandService.isHealthy();
        if (healthy) {
          return { algorand: { status: 'up', network: this.algorandService.getNetwork() } };
        }
        throw new Error('Algorand node unreachable');
      },

      // IPFS / Pinata
      async () => {
        const healthy = await this.storageService.isHealthy();
        return { ipfs: { status: healthy ? 'up' : 'down' } };
      },
    ]);
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — checks DB only' })
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
