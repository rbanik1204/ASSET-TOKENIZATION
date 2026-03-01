import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

// Config
import {
  appConfig,
  algorandConfig,
  databaseConfig,
  redisConfig,
  ipfsConfig,
  authConfig,
  throttleConfig,
} from './config';
import { validateEnv } from './config/env.validation';

// Common
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor, LoggingInterceptor } from './common/interceptors/response.interceptor';

// Domain Modules
import { WalletModule } from './modules/wallet/wallet.module';
import { AssetsModule } from './modules/assets/assets.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { KycModule } from './modules/kyc/kyc.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // ── Global config ────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [
        appConfig,
        algorandConfig,
        databaseConfig,
        redisConfig,
        ipfsConfig,
        authConfig,
        throttleConfig,
      ],
      validate: validateEnv,
    }),

    // ── Database (PostgreSQL via TypeORM) ─────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<string>('app.nodeEnv') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),

    // ── Domain modules ───────────────────────────────────────
    WalletModule,    // Global — AlgorandService
    StorageModule,   // Global — IPFS/Pinata
    AuthModule,
    AssetsModule,
    MarketplaceModule,
    GovernanceModule,
    AnalyticsModule,
    ContractsModule,
    KycModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    // Global validation pipe
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global response wrapper
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Global request logger
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
