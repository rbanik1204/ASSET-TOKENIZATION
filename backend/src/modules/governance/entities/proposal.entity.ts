import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, OneToMany,
} from 'typeorm';

export enum ProposalStatus {
  ACTIVE = 'active',
  PASSED = 'passed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum ProposalType {
  PARAMETER = 'parameter',
  ASSET_APPROVAL = 'asset-approval',
  GOVERNANCE = 'governance',
  EMERGENCY = 'emergency',
}

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'proposer_address', length: 58 })
  proposerAddress: string;

  @Column({
    type: 'enum',
    enum: ProposalType,
    default: ProposalType.GOVERNANCE,
  })
  type: ProposalType;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.ACTIVE,
  })
  status: ProposalStatus;

  @Column({ name: 'votes_for', type: 'bigint', default: 0 })
  votesFor: number;

  @Column({ name: 'votes_against', type: 'bigint', default: 0 })
  votesAgainst: number;

  @Column({ name: 'total_voting_power', type: 'bigint', default: 0 })
  totalVotingPower: number;

  @Column({ name: 'quorum_required', type: 'bigint', default: 0 })
  quorumRequired: number;

  @Column({ name: 'voting_ends', type: 'timestamp' })
  votingEnds: Date;

  @Column({ name: 'on_chain_app_id', type: 'bigint', nullable: true })
  onChainAppId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('votes')
@Index(['proposalId', 'voterAddress'], { unique: true })
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'proposal_id' })
  proposalId: string;

  @Column({ name: 'voter_address', length: 58 })
  voterAddress: string;

  @Column({ length: 10 })
  vote: string; // 'for' | 'against'

  @Column({ type: 'bigint', default: 0 })
  weight: number;

  @Column({ name: 'tx_id', length: 52, nullable: true })
  txId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
