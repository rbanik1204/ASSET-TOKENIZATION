import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { TokenizationController } from './tokenization.controller';
import { TokenizationService } from './tokenization.service';
import { Asset } from './entities/asset.entity';
import { Transaction } from './entities/transaction.entity';
import { AssetHolder } from './entities/asset-holder.entity';
import { MarketplaceListing } from '../marketplace/entities/listing.entity';
import { KycModule } from '../kyc/kyc.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, Transaction, AssetHolder, MarketplaceListing]),
    KycModule,
    NotificationsModule,
  ],
  controllers: [AssetsController, TokenizationController],
  providers: [AssetsService, TokenizationService],
  exports: [AssetsService, TokenizationService],
})
export class AssetsModule {}
