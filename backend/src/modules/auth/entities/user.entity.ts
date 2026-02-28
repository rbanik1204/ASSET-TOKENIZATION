import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ASSET_ISSUER = 'asset_issuer',
  VERIFIER = 'verifier',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING_KYC = 'pending_kyc',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 58 })
  @Index('IDX_USER_ADDRESS', { unique: true })
  walletAddress: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  /** Display name (optional — wallet-only by default) */
  @Column({ type: 'varchar', nullable: true, length: 100 })
  displayName: string | null;

  /** Algorand network this account was first seen on */
  @Column({ length: 10, default: 'testnet' })
  network: string;

  /** How many times this wallet has authenticated */
  @Column({ default: 0 })
  loginCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  /** IP of last login (for audit trail) */
  @Column({ type: 'varchar', nullable: true, length: 45 })
  lastLoginIp: string | null;

  /** Current active refresh token hash (single-session enforcement) */
  @Column({ type: 'varchar', nullable: true, length: 64 })
  refreshTokenHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
