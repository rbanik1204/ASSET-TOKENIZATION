import {
  Controller, Post, Get, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { TokenizationService } from './tokenization.service';
import { PrepareTokenizationDto, ConfirmTokenizationDto, ComplianceActionDto } from './dto/create-asset.dto';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Tokenization')
@Controller('tokenize')
export class TokenizationController {
  constructor(private readonly tokenization: TokenizationService) {}

  // ═══════════════════════════════════════════════════════════════
  // Step 1: Prepare — pin IPFS metadata + build unsigned ASA txn
  // ═══════════════════════════════════════════════════════════════

  @Public()
  @Post('prepare')
  @ApiOperation({
    summary: 'Prepare asset tokenization',
    description:
      'Validates supply rules, builds ARC-3 metadata, pins to IPFS, ' +
      'creates a DB draft record, and returns an unsigned ASA creation transaction.',
  })
  @ApiResponse({ status: 201, description: 'Preparation result with unsigned txn' })
  @ApiResponse({ status: 400, description: 'Validation error (supply rules, format, etc.)' })
  async prepare(@Body() dto: PrepareTokenizationDto) {
    return this.tokenization.prepare(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // Step 2: Confirm — link on-chain ASA to DB record
  // ═══════════════════════════════════════════════════════════════

  @Public()
  @Post('confirm')
  @ApiOperation({
    summary: 'Confirm ASA creation on-chain',
    description:
      'After the wallet signs and submits the ASA creation txn, ' +
      'call this endpoint to link the ASA ID + txn ID to the DB record.',
  })
  @ApiResponse({ status: 201, description: 'Asset fully linked' })
  @ApiResponse({ status: 404, description: 'Asset record not found' })
  async confirm(@Body() dto: ConfirmTokenizationDto) {
    return this.tokenization.confirm(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // Status
  // ═══════════════════════════════════════════════════════════════

  @Public()
  @Get('status/:id')
  @ApiOperation({ summary: 'Get tokenization pipeline status for an asset' })
  @ApiResponse({ status: 200, description: 'Tokenization status returned' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  getStatus(@Param('id') id: string) {
    return this.tokenization.getTokenizationStatus(id);
  }

  @Public()
  @Get('owner/:address')
  @ApiOperation({ summary: 'List all tokenized assets for an owner address' })
  @ApiResponse({ status: 200, description: 'Owner asset list returned' })
  getByOwner(@Param('address') address: string) {
    return this.tokenization.listByOwner(address);
  }

  // ═══════════════════════════════════════════════════════════════
  // Compliance: Freeze
  // ═══════════════════════════════════════════════════════════════

  @Public()
  @Post('freeze')
  @ApiOperation({
    summary: 'Build an unsigned freeze/unfreeze transaction',
    description: 'Returns an unsigned txn for the wallet to sign. Only the freeze address can call this.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        asaId: { type: 'number' },
        targetAddress: { type: 'string' },
        frozen: { type: 'boolean' },
        senderAddress: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Unsigned freeze txn returned' })
  async buildFreeze(
    @Body() body: { asaId: number; targetAddress: string; frozen: boolean; senderAddress: string },
  ) {
    return this.tokenization.buildFreezeTxn(
      body.asaId, body.targetAddress, body.frozen, body.senderAddress,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Compliance: Clawback
  // ═══════════════════════════════════════════════════════════════

  @Public()
  @Post('clawback')
  @ApiOperation({
    summary: 'Build an unsigned clawback (token revocation) transaction',
    description: 'Returns an unsigned txn for the wallet to sign. Only the clawback address can call this.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        asaId: { type: 'number' },
        targetAddress: { type: 'string' },
        amount: { type: 'number' },
        reason: { type: 'string' },
        senderAddress: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Unsigned clawback txn returned' })
  async buildClawback(
    @Body() body: ComplianceActionDto & { senderAddress: string },
  ) {
    return this.tokenization.buildClawbackTxn(body, body.senderAddress);
  }
}
