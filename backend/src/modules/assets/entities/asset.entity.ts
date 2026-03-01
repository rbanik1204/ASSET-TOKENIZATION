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

export enum TokenizationStatus {
  DRAFT = 'draft',
  METADATA_PINNED = 'metadata_pinned',
  ASA_CREATED = 'asa_created',
  FULLY_LINKED = 'fully_linked',
  FAILED = 'failed',
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

  // ── Compliance / Freeze / Clawback flags ───────────────────
  @Column({ name: 'default_frozen', default: false })
  defaultFrozen: boolean;

  @Column({ name: 'is_frozen', default: false })
  isFrozen: boolean;

  @Column({ name: 'clawback_enabled', default: true })
  clawbackEnabled: boolean;

  @Column({ name: 'freeze_enabled', default: true })
  freezeEnabled: boolean;

  @Column({ name: 'compliance_note', type: 'text', nullable: true })
  complianceNote: string;

  // ── Tokenization pipeline status ───────────────────────────
  @Column({
    name: 'tokenization_status',
    type: 'enum',
    enum: TokenizationStatus,
    default: TokenizationStatus.DRAFT,
  })
  tokenizationStatus: TokenizationStatus;

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

  @Column({ name: 'ipfs_document_cids', type: 'simple-json', nullable: true })
  ipfsDocumentCids: string[];

  @Column({ name: 'supporting_documents', type: 'simple-json', nullable: true })
  supportingDocuments: { name: string; url: string; type: string; size: number }[];

  @Column({ name: 'admin_review_note', type: 'text', nullable: true })
  adminReviewNote: string;

  @Column({ name: 'reviewed_by', length: 58, nullable: true })
  reviewedBy: string;

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
