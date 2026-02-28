import { Injectable, Logger, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import algosdk from 'algosdk';
import { AlgorandService } from '../wallet/services/algorand.service';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { AuthNonce } from './entities/auth-nonce.entity';

export interface JwtPayload {
  sub: string;        // wallet address
  role: UserRole;
  network: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly accessTokenTTL: number;   // seconds
  private readonly refreshTokenTTL: number;  // seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly algorandService: AlgorandService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuthNonce)
    private readonly nonceRepo: Repository<AuthNonce>,
  ) {
    this.jwtSecret = this.configService.get<string>('auth.jwtSecret') || 'dev-secret';
    this.accessTokenTTL = this.configService.get<number>('auth.jwtExpiration') || 3600; // 1h
    this.refreshTokenTTL = 60 * 60 * 24 * 7; // 7 days
  }

  // ───────────────────────────────────────────────────────────────────
  //  1.  NONCE  — generate a challenge for the wallet to sign
  // ───────────────────────────────────────────────────────────────────

  async requestNonce(address: string) {
    // Validate address format
    if (!address || address.length !== 58) {
      throw new UnauthorizedException('Invalid Algorand address format');
    }

    // Invalidate any existing un-consumed nonces for this address
    await this.nonceRepo.update(
      { walletAddress: address, consumed: false },
      { consumed: true },
    );

    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    const message =
      `AssetLinked Authentication\n\n` +
      `Sign this message to prove you own this wallet.\n` +
      `This will NOT trigger a blockchain transaction or cost any fees.\n\n` +
      `Wallet: ${address}\n` +
      `Nonce: ${nonce}\n` +
      `Network: ${this.algorandService.getNetwork()}\n` +
      `Issued: ${new Date().toISOString()}`;

    const entity = this.nonceRepo.create({
      walletAddress: address,
      nonce,
      message,
      expiresAt,
    });
    await this.nonceRepo.save(entity);

    return { nonce, message, expiresAt: expiresAt.toISOString() };
  }

  // ───────────────────────────────────────────────────────────────────
  //  2.  VERIFY  — validate the wallet signature and issue tokens
  // ───────────────────────────────────────────────────────────────────

  async verifySignature(address: string, signatureB64: string, nonce: string, ip?: string) {
    // 1. Find the nonce
    const nonceEntity = await this.nonceRepo.findOne({
      where: { walletAddress: address, nonce, consumed: false },
    });
    if (!nonceEntity) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    // 2. Check expiration
    if (new Date() > nonceEntity.expiresAt) {
      nonceEntity.consumed = true;
      await this.nonceRepo.save(nonceEntity);
      throw new UnauthorizedException('Nonce has expired — request a new one');
    }

    // 3. Verify the ed25519 signature with algosdk
    try {
      const messageBytes = new TextEncoder().encode(nonceEntity.message);
      const signatureBytes = Buffer.from(signatureB64, 'base64');
      const addr = algosdk.Address.fromString(address);

      const isValid = algosdk.verifyBytes(messageBytes, signatureBytes, addr);
      if (!isValid) {
        throw new UnauthorizedException('Signature verification failed');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`Signature verification error for ${address}: ${error.message}`);
      throw new UnauthorizedException('Invalid signature format');
    }

    // 4. Mark nonce as consumed (single-use)
    nonceEntity.consumed = true;
    await this.nonceRepo.save(nonceEntity);

    // 5. Find-or-create user
    let user = await this.userRepo.findOne({ where: { walletAddress: address } });
    if (!user) {
      user = this.userRepo.create({
        walletAddress: address,
        network: this.algorandService.getNetwork(),
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
    }
    user.loginCount += 1;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip || null;

    // 6. Issue tokens
    const accessToken = this.signJwt({
      sub: address,
      role: user.role,
      network: this.algorandService.getNetwork(),
      type: 'access',
      iat: this.nowSec(),
      exp: this.nowSec() + this.accessTokenTTL,
    });

    const refreshToken = this.signJwt({
      sub: address,
      role: user.role,
      network: this.algorandService.getNetwork(),
      type: 'refresh',
      iat: this.nowSec(),
      exp: this.nowSec() + this.refreshTokenTTL,
    });

    // Store hash of refresh token for single-session enforcement
    user.refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.userRepo.save(user);

    this.logger.log(`Wallet ${address} authenticated (role=${user.role})`);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTTL,
      address,
      role: user.role,
      network: this.algorandService.getNetwork(),
    };
  }

  // ───────────────────────────────────────────────────────────────────
  //  3.  REFRESH  — rotate access token using refresh token
  // ───────────────────────────────────────────────────────────────────

  async refreshAccessToken(refreshToken: string) {
    const payload = this.verifyToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Not a refresh token');
    }

    const user = await this.userRepo.findOne({ where: { walletAddress: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');

    // Verify refresh token matches the stored hash (prevents reuse of old tokens)
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (user.refreshTokenHash !== hash) {
      // Possible token theft — invalidate session
      user.refreshTokenHash = null;
      await this.userRepo.save(user);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    // Issue new access token
    const newAccess = this.signJwt({
      sub: user.walletAddress,
      role: user.role,
      network: this.algorandService.getNetwork(),
      type: 'access',
      iat: this.nowSec(),
      exp: this.nowSec() + this.accessTokenTTL,
    });

    // Issue new refresh token (rotation)
    const newRefresh = this.signJwt({
      sub: user.walletAddress,
      role: user.role,
      network: this.algorandService.getNetwork(),
      type: 'refresh',
      iat: this.nowSec(),
      exp: this.nowSec() + this.refreshTokenTTL,
    });

    user.refreshTokenHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
    await this.userRepo.save(user);

    return {
      accessToken: newAccess,
      refreshToken: newRefresh,
      expiresIn: this.accessTokenTTL,
    };
  }

  // ───────────────────────────────────────────────────────────────────
  //  4.  LOGOUT  — invalidate refresh token
  // ───────────────────────────────────────────────────────────────────

  async logout(address: string) {
    await this.userRepo.update({ walletAddress: address }, { refreshTokenHash: null });
    this.logger.log(`Wallet ${address} logged out`);
    return { success: true };
  }

  // ───────────────────────────────────────────────────────────────────
  //  5.  GET PROFILE / ME
  // ───────────────────────────────────────────────────────────────────

  async getProfile(address: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress: address } });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      status: user.status,
      displayName: user.displayName,
      network: user.network,
      loginCount: user.loginCount,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  // ───────────────────────────────────────────────────────────────────
  //  6.  ROLE MANAGEMENT  (admin only)
  // ───────────────────────────────────────────────────────────────────

  async updateRole(targetAddress: string, newRole: UserRole) {
    const user = await this.userRepo.findOne({ where: { walletAddress: targetAddress } });
    if (!user) throw new NotFoundException(`User with address ${targetAddress} not found`);
    user.role = newRole;
    await this.userRepo.save(user);
    this.logger.log(`Role updated: ${targetAddress} → ${newRole}`);
    return { address: targetAddress, role: newRole };
  }

  async getAllUsers(page = 1, limit = 20) {
    const [users, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'walletAddress', 'role', 'status', 'displayName', 'network', 'loginCount', 'lastLoginAt', 'createdAt'],
    });
    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ───────────────────────────────────────────────────────────────────
  //  JWT helpers
  // ───────────────────────────────────────────────────────────────────

  verifyToken(token: string): JwtPayload {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Malformed token');

      const [headerB64, payloadB64, signatureB64] = parts;
      const signInput = `${headerB64}.${payloadB64}`;
      const expectedSig = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(signInput)
        .digest('base64url');

      if (expectedSig !== signatureB64) {
        throw new UnauthorizedException('Invalid token signature');
      }

      const payload: JwtPayload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString(),
      );

      if (payload.exp < this.nowSec()) {
        throw new UnauthorizedException('Token expired');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid token');
    }
  }

  private signJwt(payload: JwtPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  private nowSec(): number {
    return Math.floor(Date.now() / 1000);
  }

  // ───────────────────────────────────────────────────────────────────
  //  Maintenance: purge expired nonces
  // ───────────────────────────────────────────────────────────────────

  async purgeExpiredNonces() {
    const result = await this.nonceRepo.delete({
      expiresAt: LessThan(new Date()),
      consumed: true,
    });
    if (result.affected && result.affected > 0) {
      this.logger.debug(`Purged ${result.affected} expired nonces`);
    }
  }
}
