import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('asset_holders')
@Index(['asaId', 'holderAddress'], { unique: true })
export class AssetHolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'asa_id', type: 'bigint' })
  asaId: number;

  @Index()
  @Column({ name: 'holder_address', length: 58 })
  holderAddress: string;

  @Column({ type: 'bigint', default: 0 })
  balance: number;

  @Column({ name: 'opted_in', default: true })
  optedIn: boolean;

  @UpdateDateColumn({ name: 'last_updated' })
  lastUpdated: Date;
}
