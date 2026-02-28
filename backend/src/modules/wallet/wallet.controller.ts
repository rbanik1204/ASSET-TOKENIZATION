import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AlgorandService } from './services/algorand.service';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Wallet')
@Public()
@Controller('wallet')
export class WalletController {
  constructor(private readonly algorandService: AlgorandService) {}

  @Get('network')
  @ApiOperation({ summary: 'Get current Algorand network configuration' })
  @ApiResponse({ status: 200, description: 'Network info returned' })
  getNetwork() {
    return {
      network: this.algorandService.getNetwork(),
      isMainnet: this.algorandService.isMainnet(),
    };
  }

  @Get('account/:address')
  @ApiOperation({ summary: 'Get account information from Algorand node' })
  @ApiResponse({ status: 200, description: 'Account info returned' })
  async getAccountInfo(@Param('address') address: string) {
    return this.algorandService.getAccountInfo(address);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Algorand node status' })
  @ApiResponse({ status: 200, description: 'Node status returned' })
  async getNodeStatus() {
    return this.algorandService.getStatus();
  }
}
