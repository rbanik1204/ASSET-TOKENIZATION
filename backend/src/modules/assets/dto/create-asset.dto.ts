import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean,
  IsEnum, Min, Max, MaxLength, MinLength, IsArray,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetCategory } from '../entities/asset.entity';

/**
 * DTO for the first step — prepare tokenization.
 * Backend pins metadata to IPFS and returns an unsigned ASA creation txn.
 */
export class PrepareTokenizationDto {
  @ApiProperty({ description: 'Asset display name', example: 'Solar Farm — Phase 1' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'ASA unit name (max 8 chars)', example: 'SLRF' })
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(8)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'unitName must be alphanumeric' })
  unitName: string;

  @ApiProperty({ description: 'Total supply of fractional units', example: 1000000 })
  @Type(() => Number) @IsNumber() @Min(1) @Max(Number.MAX_SAFE_INTEGER)
  totalSupply: number;

  @ApiProperty({ description: 'Decimal precision (0–19)', example: 0 })
  @Type(() => Number) @IsNumber() @Min(0) @Max(19)
  decimals: number;

  @ApiProperty({ description: 'Asset category', enum: AssetCategory, example: 'energy' })
  @IsEnum(AssetCategory)
  category: AssetCategory;

  @ApiPropertyOptional({ description: 'Human-readable description' })
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Creator / owner Algorand address (58 chars)', example: 'OSTF3S...' })
  @IsString() @IsNotEmpty()
  @Matches(/^[A-Z2-7]{58}$/, { message: 'Invalid Algorand address format' })
  creator: string;

  // ── Supply rules ──────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Freeze asset on creation', default: false })
  @IsOptional() @IsBoolean()
  defaultFrozen?: boolean;

  // ── Role addresses (optional — default to creator) ────────
  @ApiPropertyOptional({ description: 'Manager address (can reconfigure asset)' })
  @IsOptional() @IsString()
  manager?: string;

  @ApiPropertyOptional({ description: 'Reserve address (non-minted supply holder)' })
  @IsOptional() @IsString()
  reserve?: string;

  @ApiPropertyOptional({ description: 'Freeze address (can freeze/unfreeze holders)' })
  @IsOptional() @IsString()
  freeze?: string;

  @ApiPropertyOptional({ description: 'Clawback address (can revoke tokens)' })
  @IsOptional() @IsString()
  clawback?: string;

  // ── Extra metadata for IPFS ───────────────────────────────
  @ApiPropertyOptional({ description: 'External URL (property listing, docs, etc.)' })
  @IsOptional() @IsString() @MaxLength(256)
  url?: string;

  @ApiPropertyOptional({ description: 'Price per unit', example: 10.50 })
  @IsOptional() @Type(() => Number) @IsNumber()
  pricePerUnit?: number;

  @ApiPropertyOptional({ description: 'Pricing currency', example: 'ALGO' })
  @IsOptional() @IsString() @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Document IPFS CIDs (uploaded separately)' })
  @IsOptional() @IsArray() @IsString({ each: true })
  documentCids?: string[];

  @ApiPropertyOptional({ description: 'Arbitrary metadata properties' })
  @IsOptional()
  properties?: Record<string, any>;
}

/**
 * DTO for the second step — confirm that the ASA was created on-chain.
 */
export class ConfirmTokenizationDto {
  @ApiProperty({ description: 'Database asset record ID' })
  @IsString() @IsNotEmpty()
  assetRecordId: string;

  @ApiProperty({ description: 'Algorand transaction ID of the ASA creation', example: 'TXN...' })
  @IsString() @IsNotEmpty()
  txId: string;

  @ApiProperty({ description: 'Algorand ASA ID returned after creation', example: 123456789 })
  @Type(() => Number) @IsNumber() @Min(1)
  asaId: number;
}

/**
 * DTO for freeze / clawback operations.
 */
export class ComplianceActionDto {
  @ApiProperty({ description: 'ASA ID to act on' })
  @Type(() => Number) @IsNumber() @Min(1)
  asaId: number;

  @ApiPropertyOptional({ description: 'Target holder address for freeze/clawback' })
  @IsOptional() @IsString()
  targetAddress?: string;

  @ApiPropertyOptional({ description: 'Amount to clawback (for clawback actions)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  amount?: number;

  @ApiPropertyOptional({ description: 'Compliance note / reason' })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
