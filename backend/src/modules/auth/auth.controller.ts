import {
  Controller, Post, Get, Patch, Body, Req,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RequestNonceDto,
  VerifySignatureDto,
  RefreshTokenDto,
  UpdateRoleDto,
} from './dto/auth.dto';
import { Public, Roles, RequestUser } from './guards/jwt-auth.guard';
import { UserRole } from './entities/user.entity';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── 1. Request Nonce ─────────────────────────────────────────────
  @Public()
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a challenge nonce for wallet signature authentication',
    description:
      'Returns a random nonce + human-readable message. ' +
      'The wallet must sign this message and submit via POST /auth/verify.',
  })
  @ApiBody({ type: RequestNonceDto })
  @ApiResponse({ status: 200, description: 'Nonce generated' })
  async requestNonce(@Body() dto: RequestNonceDto) {
    return this.authService.requestNonce(dto.address);
  }

  // ─── 2. Verify Signature → JWT ───────────────────────────────────
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit wallet signature to authenticate and receive JWT tokens',
    description:
      'Validates the ed25519 signature against the nonce. ' +
      'Returns access + refresh tokens. The user is auto-created on first login.',
  })
  @ApiBody({ type: VerifySignatureDto })
  @ApiResponse({ status: 200, description: 'JWT tokens returned' })
  @ApiResponse({ status: 401, description: 'Signature verification failed' })
  async verify(@Body() dto: VerifySignatureDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || undefined;
    return this.authService.verifySignature(dto.address, dto.signature, dto.nonce, ip);
  }

  // ─── 3. Refresh Token ────────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange refresh token for new access + refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'New tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  // ─── 4. Logout ────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current session (revoke refresh token)' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(@Req() req: Request) {
    const user = (req as any).user as RequestUser;
    return this.authService.logout(user.address);
  }

  // ─── 5. Get Current User ─────────────────────────────────────────
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async me(@Req() req: Request) {
    const user = (req as any).user as RequestUser;
    return this.authService.getProfile(user.address);
  }

  // ─── 6. Update Role (admin only) ─────────────────────────────────
  @Patch('role')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change a user\'s role (admin only)' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async updateRole(@Body() dto: UpdateRoleDto) {
    return this.authService.updateRole(dto.targetAddress, dto.role);
  }

  // ─── 7. List Users (admin only) ──────────────────────────────────
  @Get('users')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all registered users (admin only)' })
  @ApiResponse({ status: 200, description: 'User list returned' })
  async listUsers() {
    return this.authService.getAllUsers();
  }
}
