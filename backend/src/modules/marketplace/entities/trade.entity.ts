import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum TradeStatus {
  PENDING    = 'pending',      // unsigned txn prepared
  SIGNED     = 'signed',       // buyer signed, waiting confirmation
  CONFIRMED  = 'confirmed',    // on-chain confirmed
  FAILED     = 'failed',
}

/**
 * Records each completed (or attempted) trade on the marketplace.
 * A single listing can have many trades (partial fills).
 */
@Entity('marketplace_trades')
export class MarketplaceTrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /* ── References ──────────────────────────────────────── */
  @Index()
  @Column({ name: 'listing_id' })
  listingId: string;

  @Index()
  @Column({ name: 'asa_id', type: 'bigint' })
  asaId: number;

  /* ── Parties ─────────────────────────────────────────── */
  @Index()
  @Column({ name: 'buyer_address', length: 58 })
  buyerAddress: string;

  @Index()
  @Column({ name: 'seller_address', length: 58 })
  sellerAddress: string;

  /* ── Amounts ─────────────────────────────────────────── */
  @Column({ type: 'bigint' })
  units: number;                  // ASA units traded

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 20, scale: 6 })
  pricePerUnit: number;

  @Column({ name: 'total_algo', type: 'bigint' })
  totalAlgo: number;              // total in microAlgos

  @Column({ name: 'platform_fee', type: 'bigint', default: 0 })
  platformFee: number;            // fee in microAlgos

  @Column({ name: 'seller_proceeds', type: 'bigint' })
  sellerProceeds: number;         // seller receives (totalAlgo - platformFee)

  /* ── On-chain ────────────────────────────────────────── */
  @Column({ name: 'group_tx_id', type: 'varchar', nullable: true })
  groupTxId: string | null;       // atomic group tx ID

  @Column({ name: 'payment_tx_id', type: 'varchar', nullable: true })
  paymentTxId: string | null;     // buyer → seller ALGO payment

  @Column({ name: 'asset_tx_id', type: 'varchar', nullable: true })
  assetTxId: string | null;       // seller → buyer ASA transfer

  @Column({ name: 'fee_tx_id', type: 'varchar', nullable: true })
  feeTxId: string | null;         // buyer → platform fee payment

  @Column({ name: 'confirmed_round', type: 'bigint', nullable: true })
  confirmedRound: number | null;

  /* ── Unsigned txns (for client signing) ──────────────── */
  @Column({ name: 'unsigned_txns', type: 'text', nullable: true })
  unsignedTxns: string | null;    // base64 encoded group

  @Column({ name: 'buyer_sign_indices_json', type: 'text', nullable: true })
  buyerSignIndicesJson: string | null;  // JSON array of buyer-signed txn indices

  /* ── Status ──────────────────────────────────────────── */
  @Column({
    type: 'enum',
    enum: TradeStatus,
    default: TradeStatus.PENDING,
  })
  status: TradeStatus;

  @Column({ length: 20, default: 'testnet' })
  network: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
