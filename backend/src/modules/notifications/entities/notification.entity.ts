import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum NotificationType {
  PURCHASE_CREDIT  = 'purchase',      // seller receives ALGO from a token sale
  ASSET_APPROVED   = 'income',        // asset approved by admin
  ASSET_REJECTED   = 'alert',         // asset rejected by admin
  ASSET_LISTED     = 'system',        // asset auto-listed on marketplace
  SYSTEM           = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Wallet address of the recipient */
  @Index()
  @Column({ name: 'wallet_address', length: 58 })
  walletAddress: string;

  @Column({ length: 20, default: 'system' })
  type: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'tx_id', type: 'varchar', nullable: true })
  txId: string | null;

  @Column({ length: 20, default: 'testnet' })
  network: string;

  @Column({ name: 'action_url', type: 'varchar', nullable: true })
  actionUrl: string | null;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  timestamp: Date;
}
