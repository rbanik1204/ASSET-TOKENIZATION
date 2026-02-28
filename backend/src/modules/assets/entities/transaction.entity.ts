import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum TransactionType {
  PAYMENT = 'payment',
  ASSET_TRANSFER = 'asset_transfer',
  ASSET_CREATE = 'asset_create',
  ATOMIC_SWAP = 'atomic_swap',
  OPT_IN = 'opt_in',
  OPT_OUT = 'opt_out',
  DISTRIBUTION = 'distribution',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'tx_id', length: 52 })
  txId: string;

  @Column({ name: 'group_id', length: 52, nullable: true })
  groupId: string;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Index()
  @Column({ name: 'from_address', length: 58 })
  fromAddress: string;

  @Index()
  @Column({ name: 'to_address', length: 58 })
  toAddress: string;

  @Index()
  @Column({ name: 'asset_id', type: 'bigint', nullable: true })
  assetId: number;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'bigint', nullable: true })
  fee: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ name: 'confirmed_round', type: 'bigint', nullable: true })
  confirmedRound: number;

  @Column({ length: 20, default: 'testnet' })
  network: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
