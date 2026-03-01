import {
  IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, Max, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/* ───────────────────────────────────────────────────────────
   Create Listing
   ─────────────────────────────────────────────────────────── */
export class CreateListingDto {
  @ApiProperty({ description: 'Internal asset UUID' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Algorand ASA ID' })
  @IsNumber()
  @Type(() => Number)
  asaId: number;

  @ApiProperty()
  @IsString()
  assetName: string;

  @ApiProperty()
  @IsString()
  unitName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Seller Algorand address' })
  @IsString()
  sellerAddress: string;

  @ApiProperty({ description: 'Price per unit in ALGO' })
  @IsNumber()
  @Type(() => Number)
  @Min(0.000001)
  pricePerUnit: number;

  @ApiProperty({ description: 'Number of units to list' })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Minimum units per purchase (default 1)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  minPurchase?: number;

  @ApiPropertyOptional({ description: 'Listing description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Expiry date ISO string' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/* ───────────────────────────────────────────────────────────
   Prepare Buy (returns unsigned atomic txn group)
   ─────────────────────────────────────────────────────────── */
export class PrepareBuyDto {
  @ApiProperty({ description: 'Listing UUID' })
  @IsString()
  listingId: string;

  @ApiProperty({ description: 'Buyer Algorand address' })
  @IsString()
  buyerAddress: string;

  @ApiProperty({ description: 'Number of units to buy' })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  units: number;
}

/* ───────────────────────────────────────────────────────────
   Confirm Buy (submit signed txns)
   ─────────────────────────────────────────────────────────── */
export class ConfirmBuyDto {
  @ApiProperty({ description: 'Trade UUID (from prepare response)' })
  @IsString()
  tradeId: string;

  @ApiProperty({
    description: 'Array of base64-encoded signed transactions',
    type: [String],
  })
  @IsString({ each: true })
  signedTxns: string[];
}

/* ───────────────────────────────────────────────────────────
   Cancel Listing
   ─────────────────────────────────────────────────────────── */
export class CancelListingDto {
  @ApiProperty({ description: 'Seller Algorand address (must match listing)' })
  @IsString()
  sellerAddress: string;
}

/* ───────────────────────────────────────────────────────────
   Listing Filters
   ─────────────────────────────────────────────────────────── */
export class ListingFiltersDto {
  @ApiPropertyOptional({ enum: ['active', 'filled', 'partial', 'cancelled', 'expired'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerAddress?: string;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: 'price' | 'date' | 'quantity';

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
