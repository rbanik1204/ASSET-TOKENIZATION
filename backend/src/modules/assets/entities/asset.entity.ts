import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, OneToMany,
} from 'typeorm';

export enum AssetCategory {
  REAL_ESTATE = 'real-estate',
  ENERGY = 'energy',
  COMMODITIES = 'commodities',
  INFRASTRUCTURE = 'infrastructure',
  SECURITIES = 'securities',
  OTHER = 'other',
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'unit_name', length: 8 })
  unitName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: AssetCategory, default: AssetCategory.OTHER })
  category: AssetCategory;

  @Column({ name: 'total_supply', type: 'bigint', default: 0 })
  totalSupply: number;

  @Column({ type: 'int', default: 0 })
  decimals: number;

  // ── Algorand on-chain fields ───────────────────────────────
  @Index({ unique: true })
  @Column({ name: 'asa_id', type: 'bigint', nullable: true })
  asaId: number;

  @Column({ name: 'asa_creator', length: 58, nullable: true })
  asaCreator: string;

  @Column({ name: 'asa_network', length: 20, default: 'testnet' })
  asaNetwork: string;

  @Column({ name: 'asa_manager', length: 58, nullable: true })
  asaManager: string;

  @Column({ name: 'asa_reserve', length: 58, nullable: true })
  asaReserve: string;

  @Column({ name: 'asa_freeze', length: 58, nullable: true })
  asaFreeze: string;

  @Column({ name: 'asa_clawback', length: 58, nullable: true })
  asaClawback: string;

  @Column({ name: 'asa_tx_id', length: 52, nullable: true })
  asaTxId: string;

  @Column({ name: 'asa_url', length: 96, nullable: true })
  asaUrl: string;

  @Column({ name: 'metadata_hash', length: 64, nullable: true })
  metadataHash: string;

  // ── Verification ───────────────────────────────────────────
  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Column({ name: 'verification_date', type: 'timestamp', nullable: true })
  verificationDate: Date;

  // ── IPFS ───────────────────────────────────────────────────
  @Column({ name: 'ipfs_cid', nullable: true })
  ipfsCid: string;

  @Column({ name: 'ipfs_metadata_uri', nullable: true })
  ipfsMetadataUri: string;

  // ── Owner ──────────────────────────────────────────────────
  @Column({ name: 'owner_address', length: 58 })
  ownerAddress: string;

  // ── Pricing ────────────────────────────────────────────────
  @Column({ name: 'price_per_unit', type: 'decimal', precision: 20, scale: 6, default: 0 })
  pricePerUnit: number;

  @Column({ length: 10, default: 'ALGO' })
  currency: string;

  // ── Timestamps ─────────────────────────────────────────────
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
