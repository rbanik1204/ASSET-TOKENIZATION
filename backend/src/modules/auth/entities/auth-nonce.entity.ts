import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('auth_nonces')
export class AuthNonce {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The wallet address that requested this nonce */
  @Column({ length: 58 })
  @Index('IDX_NONCE_ADDRESS')
  walletAddress: string;

  /** Random 32-byte hex nonce */
  @Column({ unique: true, length: 64 })
  nonce: string;

  /** The full human-readable message the wallet signs */
  @Column({ type: 'text' })
  message: string;

  /** When this nonce expires (5 minutes from creation) */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /** Set to true once the nonce has been consumed */
  @Column({ default: false })
  consumed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
