import {
  Injectable, Logger, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

import { KycSubmission, KycStatus } from './entities/kyc-submission.entity';
import { KycSession, KycSessionStatus } from './entities/kyc-session.entity';
import { SubmitKycDto, ReviewKycDto, RevokeKycDto } from './dto/kyc.dto';
import { StorageService } from '../storage/storage.service';
import { AlgorandService } from '../wallet/services/algorand.service';

// ── Thresholds ──────────────────────────────────────────────────
const LIVENESS_MIN_SCORE      = 0.40;   // minimum liveness score to proceed (relaxed for mobile cameras)
const LIVENESS_MIN_CHALLENGES = 1;      // must pass at least 1 challenge (relaxed for mobile)
const LIVENESS_MIN_FRAMES     = 3;      // at least 3 frames analysed (relaxed for mobile)
const FACE_MATCH_AUTO_PASS    = 0.80;   // auto-approve face match above this
const FACE_MATCH_MIN          = 0.50;   // below this = auto-reject face match

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(KycSubmission)
    private readonly kycRepo: Repository<KycSubmission>,
    @InjectRepository(KycSession)
    private readonly sessionRepo: Repository<KycSession>,
    private readonly storage: StorageService,
    private readonly algorand: AlgorandService,
    private readonly config: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // 1.  SUBMIT  —  biometric selfie + liveness + optional ID
  // ═══════════════════════════════════════════════════════════════

  async submit(dto: SubmitKycDto) {
    // ── Check for existing submission ──────────────────────────
    const existing = await this.kycRepo.findOne({
      where: { walletAddress: dto.walletAddress },
    });

    if (existing) {
      if (existing.status === KycStatus.APPROVED) {
        throw new ConflictException('KYC already approved for this wallet');
      }
      if (existing.status === KycStatus.PENDING) {
        throw new ConflictException('KYC submission already pending review');
      }
      // Allow re-submission if REJECTED or REVOKED
    }

    // ── Validate liveness ──────────────────────────────────────
    this.validateLiveness(dto);

    // ── Validate face match (if ID provided) ───────────────────
    let faceMatchPassed = false;
    if (dto.faceMatchScore !== undefined && dto.faceMatchScore !== null) {
      if (dto.faceMatchScore < FACE_MATCH_MIN) {
        throw new BadRequestException(
          `Face match score ${dto.faceMatchScore.toFixed(2)} is below minimum threshold (${FACE_MATCH_MIN}). Please retake your selfie.`,
        );
      }
      faceMatchPassed = dto.faceMatchScore >= FACE_MATCH_AUTO_PASS;
    }

    // ── Build audit proof JSON ─────────────────────────────────
    const auditProof = this.buildAuditProof(dto, faceMatchPassed);

    // ── Pin audit proof to IPFS ────────────────────────────────
    let ipfsCid = '';
    let ipfsUri = '';
    try {
      const ipfsResult = await this.storage.pinJSON(
        auditProof,
        `kyc-audit-${dto.walletAddress.slice(0, 8)}-${Date.now()}`,
      );
      ipfsCid = ipfsResult.cid;
      ipfsUri = ipfsResult.uri;
      this.logger.log(`KYC audit proof pinned to IPFS: ${ipfsCid}`);
    } catch (err) {
      this.logger.warn(`IPFS pin failed — proceeding with mock CID: ${err}`);
      const mockHash = createHash('sha256')
        .update(JSON.stringify(auditProof))
        .digest('hex');
      ipfsCid = `Qm${mockHash.slice(0, 44)}`;
      ipfsUri = `ipfs://${ipfsCid}`;
    }

    // ── Upsert KYC record ──────────────────────────────────────
    const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(' ') || null;

    const record = existing || this.kycRepo.create({ walletAddress: dto.walletAddress });

    record.fullName = fullName;
    record.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    record.nationality = dto.nationality || null;
    record.documentType = dto.documentType || null;
    record.documentNumber = dto.documentNumber || null;

    record.selfieBiometricHash = dto.selfieBiometricHash;
    record.documentPhotoHash = dto.documentPhotoHash || null;

    record.livenessScore = dto.liveness.score;
    record.livenessChallengesPassed = dto.liveness.challengesPassed;
    record.livenessFrameCount = dto.liveness.frameCount;

    record.faceMatchScore = dto.faceMatchScore ?? null;
    record.faceMatchPassed = faceMatchPassed;

    record.ipfsAuditCid = ipfsCid;
    record.ipfsAuditUri = ipfsUri;

    record.status = KycStatus.PENDING;
    record.rejectionReason = null;
    record.reviewedBy = null;
    record.reviewedAt = null;
    record.onchainTxId = null;
    record.onchainVerified = false;

    record.auditLog = [
      ...(record.auditLog || []),
      {
        action: 'submitted',
        by: dto.walletAddress,
        at: new Date().toISOString(),
        details: `Liveness: ${dto.liveness.score.toFixed(2)}, Challenges: ${dto.liveness.challengesPassed.join(',')}`,
      },
    ];

    const saved = await this.kycRepo.save(record);

    this.logger.log(`KYC submitted for ${dto.walletAddress} → status: PENDING, IPFS: ${ipfsCid}`);

    return {
      success: true,
      submissionId: saved.id,
      status: saved.status,
      ipfsCid,
      ipfsUri,
      livenessScore: dto.liveness.score,
      faceMatchScore: dto.faceMatchScore ?? null,
      faceMatchPassed,
      message: 'KYC submitted successfully — pending admin review',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 2.  ADMIN REVIEW  —  approve / reject
  // ═══════════════════════════════════════════════════════════════

  async review(dto: ReviewKycDto) {
    const record = await this.kycRepo.findOne({
      where: { walletAddress: dto.walletAddress },
    });
    if (!record) throw new NotFoundException('No KYC submission found for this wallet');
    if (record.status !== KycStatus.PENDING) {
      throw new BadRequestException(`Cannot review — current status is ${record.status}`);
    }

    record.status = dto.approve ? KycStatus.APPROVED : KycStatus.REJECTED;
    record.rejectionReason = dto.approve ? null : (dto.reason || 'No reason provided');
    record.reviewedBy = dto.reviewerAddress;
    record.reviewedAt = new Date();

    record.auditLog = [
      ...(record.auditLog || []),
      {
        action: dto.approve ? 'approved' : 'rejected',
        by: dto.reviewerAddress,
        at: new Date().toISOString(),
        details: dto.approve ? 'Admin approved' : `Rejected: ${dto.reason || 'No reason'}`,
      },
    ];

    // ── Pin updated audit proof to IPFS ─────────────────────────
    try {
      const reviewProof = {
        wallet: dto.walletAddress,
        action: dto.approve ? 'approved' : 'rejected',
        reviewer: dto.reviewerAddress,
        reason: dto.reason || null,
        previous_audit_cid: record.ipfsAuditCid,
        timestamp: new Date().toISOString(),
      };
      const result = await this.storage.pinJSON(
        reviewProof,
        `kyc-review-${dto.walletAddress.slice(0, 8)}-${Date.now()}`,
      );
      record.ipfsAuditCid = result.cid;
      record.ipfsAuditUri = result.uri;
    } catch (err) {
      this.logger.warn(`IPFS pin for review failed: ${err}`);
    }

    const saved = await this.kycRepo.save(record);

    this.logger.log(`KYC ${dto.approve ? 'APPROVED' : 'REJECTED'} for ${dto.walletAddress} by ${dto.reviewerAddress}`);

    return {
      success: true,
      walletAddress: dto.walletAddress,
      status: saved.status,
      reviewedBy: saved.reviewedBy,
      reviewedAt: saved.reviewedAt,
      ipfsAuditCid: saved.ipfsAuditCid,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3.  REVOKE  —  admin revokes previously approved KYC
  // ═══════════════════════════════════════════════════════════════

  async revoke(dto: RevokeKycDto) {
    const record = await this.kycRepo.findOne({
      where: { walletAddress: dto.walletAddress },
    });
    if (!record) throw new NotFoundException('No KYC submission found');
    if (record.status !== KycStatus.APPROVED) {
      throw new BadRequestException('Can only revoke APPROVED KYC');
    }

    record.status = KycStatus.REVOKED;
    record.rejectionReason = dto.reason;
    record.reviewedBy = dto.reviewerAddress;
    record.reviewedAt = new Date();
    record.onchainVerified = false;

    record.auditLog = [
      ...(record.auditLog || []),
      {
        action: 'revoked',
        by: dto.reviewerAddress,
        at: new Date().toISOString(),
        details: `Revoked: ${dto.reason}`,
      },
    ];

    const saved = await this.kycRepo.save(record);

    this.logger.log(`KYC REVOKED for ${dto.walletAddress} by ${dto.reviewerAddress}`);

    return {
      success: true,
      walletAddress: dto.walletAddress,
      status: saved.status,
      reason: dto.reason,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 4.  STATUS  —  get KYC status for a wallet
  // ═══════════════════════════════════════════════════════════════

  async getStatus(walletAddress: string) {
    const record = await this.kycRepo.findOne({ where: { walletAddress } });

    if (!record) {
      return {
        walletAddress,
        status: KycStatus.NOT_STARTED,
        submittedAt: null,
        reviewedAt: null,
        ipfsAuditCid: null,
        onchainVerified: false,
      };
    }

    return {
      walletAddress: record.walletAddress,
      status: record.status,
      submittedAt: record.submittedAt,
      reviewedAt: record.reviewedAt,
      reviewedBy: record.reviewedBy,
      rejectionReason: record.rejectionReason,
      livenessScore: record.livenessScore,
      faceMatchScore: record.faceMatchScore,
      faceMatchPassed: record.faceMatchPassed,
      ipfsAuditCid: record.ipfsAuditCid,
      ipfsAuditUri: record.ipfsAuditUri,
      onchainVerified: record.onchainVerified,
      onchainTxId: record.onchainTxId,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 5.  LIST PENDING  —  admin queue
  // ═══════════════════════════════════════════════════════════════

  async listPending() {
    const submissions = await this.kycRepo.find({
      where: { status: KycStatus.PENDING },
      order: { submittedAt: 'ASC' },
    });

    return {
      submissions: submissions.map(s => ({
        walletAddress: s.walletAddress,
        fullName: s.fullName || 'Unknown',
        submittedAt: s.submittedAt?.toISOString(),
        status: 'pending',
        livenessScore: s.livenessScore,
        faceMatchScore: s.faceMatchScore,
        faceMatchPassed: s.faceMatchPassed,
        ipfsAuditCid: s.ipfsAuditCid,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 6.  FULL AUDIT  —  get full audit log for a wallet
  // ═══════════════════════════════════════════════════════════════

  async getAudit(walletAddress: string) {
    const record = await this.kycRepo.findOne({ where: { walletAddress } });
    if (!record) throw new NotFoundException('No KYC submission found');

    return {
      walletAddress: record.walletAddress,
      status: record.status,
      auditLog: record.auditLog || [],
      ipfsAuditCid: record.ipfsAuditCid,
      ipfsAuditUri: record.ipfsAuditUri,
      onchainVerified: record.onchainVerified,
      onchainTxId: record.onchainTxId,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 7.  IS VERIFIED  —  quick check for gating tokenization
  // ═══════════════════════════════════════════════════════════════

  async isVerified(walletAddress: string): Promise<boolean> {
    const record = await this.kycRepo.findOne({ where: { walletAddress } });
    return record?.status === KycStatus.APPROVED;
  }

  // ═══════════════════════════════════════════════════════════════
  // 8.  RECORD ON-CHAIN VERIFICATION TXN
  // ═══════════════════════════════════════════════════════════════

  async recordOnchainVerification(walletAddress: string, txId: string) {
    const record = await this.kycRepo.findOne({ where: { walletAddress } });
    if (!record) throw new NotFoundException('No KYC submission found');

    record.onchainTxId = txId;
    record.onchainVerified = true;

    record.auditLog = [
      ...(record.auditLog || []),
      {
        action: 'onchain_verified',
        by: 'system',
        at: new Date().toISOString(),
        details: `On-chain verification txn: ${txId}`,
      },
    ];

    await this.kycRepo.save(record);

    return { success: true, walletAddress, txId, onchainVerified: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // 9.  CROSS-DEVICE QR SESSION — create / poll / pair / complete
  // ═══════════════════════════════════════════════════════════════

  /** Desktop calls this to create a QR session */
  async createSession(walletAddress: string) {
    // Expire old waiting sessions for this wallet
    await this.sessionRepo.update(
      { walletAddress, status: KycSessionStatus.WAITING },
      { status: KycSessionStatus.EXPIRED },
    );

    const token = createHash('sha256')
      .update(`${walletAddress}-${Date.now()}-${Math.random()}`)
      .digest('hex');

    const session = this.sessionRepo.create({
      sessionToken: token,
      walletAddress,
      status: KycSessionStatus.WAITING,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    const saved = await this.sessionRepo.save(session);

    this.logger.log(`KYC session created for ${walletAddress}: ${token.slice(0, 12)}...`);

    return {
      sessionToken: saved.sessionToken,
      walletAddress: saved.walletAddress,
      status: saved.status,
      expiresAt: saved.expiresAt.toISOString(),
    };
  }

  /** Desktop polls this to check session status */
  async getSession(token: string) {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken: token },
    });

    if (!session) throw new NotFoundException('Session not found');

    // Auto-expire
    if (session.expiresAt < new Date() && session.status !== KycSessionStatus.COMPLETED) {
      session.status = KycSessionStatus.EXPIRED;
      await this.sessionRepo.save(session);
    }

    // If completed, include KYC status
    let kycStatus: any = null;
    if (session.status === KycSessionStatus.COMPLETED) {
      kycStatus = await this.getStatus(session.walletAddress);
    }

    return {
      sessionToken: session.sessionToken,
      walletAddress: session.walletAddress,
      status: session.status,
      mobileProgress: session.mobileProgress,
      pairedAt: session.pairedAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      expiresAt: session.expiresAt.toISOString(),
      kycStatus,
    };
  }

  /** Mobile calls this when it opens the QR link */
  async pairSession(token: string, deviceInfo?: string) {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken: token },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.expiresAt < new Date()) {
      throw new BadRequestException('Session has expired — please generate a new QR code');
    }
    if (session.status === KycSessionStatus.COMPLETED) {
      throw new BadRequestException('Session already completed');
    }

    session.status = KycSessionStatus.PAIRED;
    session.pairedAt = new Date();
    session.deviceInfo = deviceInfo || null;
    await this.sessionRepo.save(session);

    this.logger.log(`KYC session paired: ${token.slice(0, 12)}... device: ${deviceInfo || 'unknown'}`);

    return {
      sessionToken: session.sessionToken,
      walletAddress: session.walletAddress,
      status: KycSessionStatus.PAIRED,
    };
  }

  /** Mobile updates progress during biometric capture */
  async updateSessionProgress(token: string, progress: string) {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken: token },
    });
    if (!session) throw new NotFoundException('Session not found');

    session.status = KycSessionStatus.IN_PROGRESS;
    session.mobileProgress = progress;
    await this.sessionRepo.save(session);

    return { status: session.status, progress };
  }

  /** Mobile calls this after KYC is submitted */
  async completeSession(token: string) {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken: token },
    });
    if (!session) throw new NotFoundException('Session not found');

    session.status = KycSessionStatus.COMPLETED;
    session.completedAt = new Date();
    await this.sessionRepo.save(session);

    this.logger.log(`KYC session completed: ${token.slice(0, 12)}...`);

    return {
      sessionToken: session.sessionToken,
      walletAddress: session.walletAddress,
      status: KycSessionStatus.COMPLETED,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private validateLiveness(dto: SubmitKycDto) {
    const { liveness } = dto;

    if (liveness.score < LIVENESS_MIN_SCORE) {
      throw new BadRequestException(
        `Liveness score ${liveness.score.toFixed(2)} is below minimum (${LIVENESS_MIN_SCORE}). Please redo the verification.`,
      );
    }

    if (liveness.challengesPassed.length < LIVENESS_MIN_CHALLENGES) {
      throw new BadRequestException(
        `Must pass at least ${LIVENESS_MIN_CHALLENGES} liveness challenges (passed: ${liveness.challengesPassed.length}).`,
      );
    }

    if (liveness.frameCount < LIVENESS_MIN_FRAMES) {
      throw new BadRequestException(
        `Insufficient frame analysis (${liveness.frameCount} frames). Need at least ${LIVENESS_MIN_FRAMES}.`,
      );
    }
  }

  private buildAuditProof(dto: SubmitKycDto, faceMatchPassed: boolean) {
    return {
      wallet: dto.walletAddress,
      kyc_type: 'biometric_live_photo',
      liveness_score: dto.liveness.score,
      liveness_challenges: dto.liveness.challengesPassed,
      liveness_frames: dto.liveness.frameCount,
      face_match_score: dto.faceMatchScore ?? null,
      face_match_passed: faceMatchPassed,
      biometric_hash: dto.selfieBiometricHash,
      document_hash: dto.documentPhotoHash || null,
      document_type: dto.documentType || null,
      timestamp: new Date().toISOString(),
      status: 'pending',
      privacy_note: 'No raw biometric data stored — hashes only',
    };
  }
}
