import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum ListingStatus {
  ACTIVE   = 'active',
  FILLED   = 'filled',      // fully sold
  PARTIAL  = 'partial',     // partially filled
  CANCELLED = 'cancelled',
  EXPIRED  = 'expired',
}

export enum ListingType {
  SELL = 'sell',     // seller lists ASA for ALGO
  BUY  = 'buy',     // buyer bids to buy ASA (order book future)
}

@Entity('marketplace_listings')
export class MarketplaceListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /* ── Asset reference ───────────────────────────────────── */
  @Index()
  @Column({ name: 'asset_id' })
  assetId: string;                // internal uuid from assets table

  @Index()
  @Column({ name: 'asa_id', type: 'bigint' })
  asaId: number;                  // Algorand ASA ID

  @Column({ name: 'asset_name' })
  assetName: string;

  @Column({ name: 'unit_name', length: 8 })
  unitName: string;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  /* ── Seller ────────────────────────────────────────────── */
  @Index()
  @Column({ name: 'seller_address', length: 58 })
  sellerAddress: string;

  /* ── Pricing ───────────────────────────────────────────── */
  @Column({ name: 'price_per_unit', type: 'decimal', precision: 20, scale: 6 })
  pricePerUnit: number;           // price in ALGO per 1 unit

  @Column({ length: 10, default: 'ALGO' })
  currency: string;

  /* ── Quantity ──────────────────────────────────────────── */
  @Column({ name: 'original_quantity', type: 'bigint' })
  originalQuantity: number;       // units listed originally

  @Column({ name: 'remaining_quantity', type: 'bigint' })
  remainingQuantity: number;      // units still for sale

  @Column({ name: 'min_purchase', type: 'bigint', default: 1 })
  minPurchase: number;            // minimum units per order

  /* ── Escrow ────────────────────────────────────────────── */
  @Column({ name: 'escrow_app_id', type: 'bigint', nullable: true })
  escrowAppId: number | null;     // smart contract app ID (if used)

  @Column({ name: 'escrow_tx_id', type: 'varchar', nullable: true })
  escrowTxId: string | null;      // deposit tx into escrow

  /* ── Fees ──────────────────────────────────────────────── */
  @Column({ name: 'platform_fee_bps', type: 'int', default: 250 })
  platformFeeBps: number;         // basis points, 250 = 2.5%

  /* ── Status ────────────────────────────────────────────── */
  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  @Column({
    name: 'listing_type',
    type: 'enum',
    enum: ListingType,
    default: ListingType.SELL,
  })
  listingType: ListingType;

  /* ── Buyer (for fully filled) ──────────────────────────── */
  @Column({ name: 'buyer_address', type: 'varchar', nullable: true })
  buyerAddress: string | null;

  /* ── Metadata ──────────────────────────────────────────── */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
