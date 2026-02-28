import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

// ── KYC Status Lifecycle ────────────────────────────────────────
export enum KycStatus {
  NOT_STARTED  = 'not_started',
  PENDING      = 'pending',
  APPROVED     = 'approved',
  REJECTED     = 'rejected',
  REVOKED      = 'revoked',
}

// ── Liveness challenge types ────────────────────────────────────
export enum LivenessChallenge {
  BLINK       = 'blink',
  HEAD_LEFT   = 'head_left',
  HEAD_RIGHT  = 'head_right',
  SMILE       = 'smile',
}

@Entity('kyc_submissions')
export class KycSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Identity ─────────────────────────────────────────────────
  @Index({ unique: true })
  @Column({ name: 'wallet_address', length: 58 })
  walletAddress: string;

  @Column({ name: 'full_name', type: 'varchar', length: 200, nullable: true })
  fullName: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string | null;

  @Column({ name: 'document_type', type: 'varchar', length: 30, nullable: true })
  documentType: string | null;                   // passport | drivers_license | national_id

  @Column({ name: 'document_number', type: 'varchar', length: 50, nullable: true })
  documentNumber: string | null;

  // ─── Biometric hashes (NEVER raw images) ──────────────────────
  @Column({ name: 'selfie_biometric_hash', type: 'varchar', length: 128, nullable: true })
  selfieBiometricHash: string | null;            // SHA-256 of facial feature vector

  @Column({ name: 'document_photo_hash', type: 'varchar', length: 128, nullable: true })
  documentPhotoHash: string | null;              // SHA-256 of ID photo

  // ─── Liveness detection ───────────────────────────────────────
  @Column({ name: 'liveness_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  livenessScore: number | null;                  // 0.0000 → 1.0000

  @Column({
    name: 'liveness_challenges_passed',
    type: 'simple-json',
    nullable: true,
  })
  livenessChallengesPassed: string[] | null;     // ['blink', 'head_left', ...]

  @Column({ name: 'liveness_frame_count', type: 'int', nullable: true })
  livenessFrameCount: number | null;             // frames analysed

  // ─── Face match ───────────────────────────────────────────────
  @Column({ name: 'face_match_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  faceMatchScore: number | null;                 // selfie ↔ ID face similarity

  @Column({ name: 'face_match_passed', type: 'boolean', default: false })
  faceMatchPassed: boolean;

  // ─── IPFS audit ───────────────────────────────────────────────
  @Column({ name: 'ipfs_audit_cid', type: 'varchar', length: 100, nullable: true })
  ipfsAuditCid: string | null;                   // CID of the audit proof JSON

  @Column({ name: 'ipfs_audit_uri', type: 'varchar', length: 200, nullable: true })
  ipfsAuditUri: string | null;

  // ─── Status ───────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.NOT_STARTED,
  })
  status: KycStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 58, nullable: true })
  reviewedBy: string | null;                     // admin wallet address

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  // ─── On-chain ─────────────────────────────────────────────────
  @Column({ name: 'onchain_tx_id', type: 'varchar', length: 52, nullable: true })
  onchainTxId: string | null;

  @Column({ name: 'onchain_verified', type: 'boolean', default: false })
  onchainVerified: boolean;

  // ─── Timestamps ───────────────────────────────────────────────
  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ─── Audit log ────────────────────────────────────────────────
  @Column({
    name: 'audit_log',
    type: 'simple-json',
    nullable: true,
    default: '[]',
  })
  auditLog: Array<{
    action: string;
    by: string;
    at: string;
    details?: string;
  }>;
}
