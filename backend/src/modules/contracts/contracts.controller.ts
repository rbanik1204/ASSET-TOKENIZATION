import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../auth/guards/jwt-auth.guard';
import { ContractsService, ContractName } from './contracts.service';

@ApiTags('Contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('info')
  @Public()
  @ApiOperation({ summary: 'Get all contract info and deployment status' })
  @ApiResponse({ status: 200, description: 'Contract summary returned' })
  getInfo() {
    return this.contractsService.getSummary();
  }

  @Get('abi')
  @Public()
  @ApiOperation({ summary: 'Get unified ABI for all contracts' })
  @ApiResponse({ status: 200, description: 'All contract ABIs returned' })
  getAllAbis() {
    return this.contractsService.getUnifiedAbi();
  }

  @Get('abi/:name')
  @Public()
  @ApiOperation({ summary: 'Get ABI for a specific contract' })
  @ApiParam({
    name: 'name',
    enum: Object.values(ContractName),
    description: 'Contract name',
  })
  @ApiResponse({ status: 200, description: 'Contract ABI returned' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  getAbi(@Param('name') name: string) {
    const abi = this.contractsService.getAbi(name as ContractName);
    if (!abi) {
      throw new NotFoundException(`Contract "${name}" not found`);
    }
    return abi;
  }

  @Get('deployment')
  @Public()
  @ApiOperation({ summary: 'Get deployment manifest' })
  @ApiResponse({ status: 200, description: 'Deployment manifest returned' })
  getDeployment() {
    return this.contractsService.getDeploymentManifest() || {
      message: 'No deployment manifest found. Run deploy_testnet.py first.',
    };
  }

  @Get('state/:appId')
  @Public()
  @ApiOperation({ summary: 'Read on-chain global state for a deployed contract' })
  @ApiParam({ name: 'appId', description: 'Application ID on Algorand' })
  @ApiResponse({ status: 200, description: 'Global state returned' })
  async getAppState(@Param('appId') appId: string) {
    try {
      return await this.contractsService.readAppGlobalState(parseInt(appId));
    } catch (err: any) {
      throw new NotFoundException(
        `Application ${appId} not found or not accessible: ${err.message}`,
      );
    }
  }
}
