import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycSubmission } from './entities/kyc-submission.entity';
import { KycSession } from './entities/kyc-session.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycSubmission, KycSession]),
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
