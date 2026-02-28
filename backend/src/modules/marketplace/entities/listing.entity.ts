import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('marketplace_listings')
export class MarketplaceListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'asset_id' })
  assetId: string;

  @Column({ name: 'asa_id', type: 'bigint' })
  asaId: number;

  @Column({ name: 'seller_address', length: 58 })
  sellerAddress: string;

  @Column({ type: 'bigint' })
  quantity: number;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 20, scale: 6 })
  pricePerUnit: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 20, scale: 6 })
  totalPrice: number;

  @Column({ length: 10, default: 'ALGO' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  @Column({ name: 'buyer_address', length: 58, nullable: true })
  buyerAddress: string;

  @Column({ name: 'sale_tx_id', length: 52, nullable: true })
  saleTxId: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
