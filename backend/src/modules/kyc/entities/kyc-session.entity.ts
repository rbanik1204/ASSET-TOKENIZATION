import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

// ── Session status lifecycle ────────────────────────────────────
export enum KycSessionStatus {
  WAITING     = 'waiting',      // QR displayed, waiting for mobile scan
  PAIRED      = 'paired',       // Mobile opened the link
  IN_PROGRESS = 'in_progress',  // Biometric capture in progress
  COMPLETED   = 'completed',    // KYC submitted via mobile
  EXPIRED     = 'expired',      // Session timed out (15 min)
}

@Entity('kyc_sessions')
export class KycSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'session_token', length: 64 })
  sessionToken: string;

  @Column({ name: 'wallet_address', length: 58 })
  walletAddress: string;

  @Column({
    type: 'enum',
    enum: KycSessionStatus,
    default: KycSessionStatus.WAITING,
  })
  status: KycSessionStatus;

  @Column({ name: 'device_info', type: 'varchar', length: 500, nullable: true })
  deviceInfo: string | null;

  @Column({ name: 'mobile_progress', type: 'varchar', length: 50, nullable: true })
  mobileProgress: string | null;         // 'camera' | 'liveness' | 'document' | 'submitting'

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'paired_at', type: 'timestamptz', nullable: true })
  pairedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
