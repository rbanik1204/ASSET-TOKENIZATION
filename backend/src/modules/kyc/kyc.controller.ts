import {
  Controller, Post, Get, Param, Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { SubmitKycDto, ReviewKycDto, RevokeKycDto } from './dto/kyc.dto';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('KYC')
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  // ═══════════════════════════════════════════════════════════════
  // User endpoints
  // ═══════════════════════════════════════════════════════════════

  @Public()
  @Post('submit')
  @ApiOperation({
    summary: 'Submit biometric KYC verification',
    description:
      'Validates liveness detection results, stores biometric hashes (never raw images), ' +
      'pins audit proof to IPFS, and creates a pending KYC submission.',
  })
  @ApiResponse({ status: 201, description: 'KYC submission created' })
  @ApiResponse({ status: 400, description: 'Liveness / face match validation failed' })
  @ApiResponse({ status: 409, description: 'KYC already approved or pending' })
  async submit(@Body() dto: SubmitKycDto) {
    return this.kyc.submit(dto);
  }

  @Public()
  @Get('status/:address')
  @ApiOperation({ summary: 'Get KYC status for a wallet address' })
  @ApiResponse({ status: 200, description: 'KYC status returned' })
  async getStatus(@Param('address') address: string) {
    return this.kyc.getStatus(address);
  }

  @Public()
  @Get('verified/:address')
  @ApiOperation({ summary: 'Quick boolean check — is this wallet KYC-verified?' })
  async isVerified(@Param('address') address: string) {
    const verified = await this.kyc.isVerified(address);
    return { walletAddress: address, verified };
  }

  // ═══════════════════════════════════════════════════════════════
  // Admin endpoints
  // ═══════════════════════════════════════════════════════════════

  @Public()
  @Get('pending')
  @ApiOperation({ summary: 'List all pending KYC submissions (admin)' })
  @ApiResponse({ status: 200, description: 'Pending KYC queue returned' })
  async listPending() {
    return this.kyc.listPending();
  }

  @Public()
  @Post('review')
  @ApiOperation({
    summary: 'Approve or reject a KYC submission (admin)',
    description:
      'Updates KYC status, records reviewer address and reason, ' +
      'pins review decision to IPFS for audit trail.',
  })
  @ApiResponse({ status: 201, description: 'KYC review decision recorded' })
  @ApiResponse({ status: 404, description: 'No KYC submission found' })
  @ApiResponse({ status: 400, description: 'KYC not in pending status' })
  async review(@Body() dto: ReviewKycDto) {
    return this.kyc.review(dto);
  }

  @Public()
  @Post('revoke')
  @ApiOperation({
    summary: 'Revoke a previously approved KYC (admin)',
    description: 'Sets KYC status to REVOKED, records reason and reviewer.',
  })
  @ApiResponse({ status: 201, description: 'KYC revoked' })
  async revoke(@Body() dto: RevokeKycDto) {
    return this.kyc.revoke(dto);
  }

  @Public()
  @Get('audit/:address')
  @ApiOperation({ summary: 'Get full audit log for a wallet (admin)' })
  @ApiResponse({ status: 200, description: 'Audit log returned' })
  @ApiResponse({ status: 404, description: 'No KYC submission found' })
  async getAudit(@Param('address') address: string) {
    return this.kyc.getAudit(address);
  }

  @Public()
  @Post('onchain/:address')
  @ApiOperation({
    summary: 'Record on-chain KYC verification transaction',
    description: 'After an on-chain verification txn is confirmed, record the txId.',
  })
  async recordOnchain(
    @Param('address') address: string,
    @Body('txId') txId: string,
  ) {
    return this.kyc.recordOnchainVerification(address, txId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Cross-device QR session endpoints
  // ═══════════════════════════════════════════════════════════════

  @Public()
  @Post('session/create')
  @ApiOperation({
    summary: 'Create a QR-based KYC session for cross-device handoff',
    description:
      'Desktop generates a session token. A QR code is rendered with a URL ' +
      'containing the token. Mobile scans and completes biometric KYC.',
  })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(@Body('walletAddress') walletAddress: string) {
    return this.kyc.createSession(walletAddress);
  }

  @Public()
  @Get('session/:token')
  @ApiOperation({ summary: 'Poll session status (desktop polling)' })
  @ApiResponse({ status: 200, description: 'Session status returned' })
  async getSession(@Param('token') token: string) {
    return this.kyc.getSession(token);
  }

  @Public()
  @Post('session/:token/pair')
  @ApiOperation({ summary: 'Pair a mobile device to a KYC session' })
  @ApiResponse({ status: 201, description: 'Device paired' })
  async pairSession(
    @Param('token') token: string,
    @Body('deviceInfo') deviceInfo?: string,
  ) {
    return this.kyc.pairSession(token, deviceInfo);
  }

  @Public()
  @Post('session/:token/progress')
  @ApiOperation({ summary: 'Update mobile KYC progress for desktop polling' })
  async updateProgress(
    @Param('token') token: string,
    @Body('progress') progress: string,
  ) {
    return this.kyc.updateSessionProgress(token, progress);
  }

  @Public()
  @Post('session/:token/complete')
  @ApiOperation({ summary: 'Mark session as completed after mobile KYC submission' })
  async completeSession(@Param('token') token: string) {
    return this.kyc.completeSession(token);
  }
}
