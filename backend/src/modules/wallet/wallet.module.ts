import { Module, Global } from '@nestjs/common';
import { AlgorandService } from './services/algorand.service';

@Global()
@Module({
  providers: [AlgorandService],
  exports: [AlgorandService],
})
export class WalletModule {}
