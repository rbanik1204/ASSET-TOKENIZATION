import {
  IsString, IsOptional, IsEnum, IsNumber, IsArray,
  IsBoolean, Min, Max, Matches, MaxLength, IsDateString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════
// 1. Submit biometric KYC from frontend
// ═══════════════════════════════════════════════════════════════

export class LivenessResultDto {
  @ApiProperty({ description: 'Liveness score 0–1' })
  @IsNumber()
  @Min(0) @Max(1)
  score: number;

  @ApiProperty({ description: 'Liveness challenges passed', example: ['blink', 'head_left'] })
  @IsArray()
  @IsString({ each: true })
  challengesPassed: string[];

  @ApiProperty({ description: 'Number of frames analysed' })
  @IsNumber()
  @Min(1)
  frameCount: number;
}

export class SubmitKycDto {
  @ApiProperty({ description: 'Algorand wallet address', example: 'OSTF3...' })
  @IsString()
  @Matches(/^[A-Z2-7]{58}$/, { message: 'Invalid Algorand address' })
  walletAddress: string;

  // ── Personal info (optional for biometric-only MVP) ────────
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(60)
  nationality?: string;

  // ── Document (optional for MVP) ────────────────────────────
  @ApiPropertyOptional({ enum: ['passport', 'drivers_license', 'national_id'] })
  @IsOptional() @IsString()
  documentType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  documentNumber?: string;

  // ── Biometric hashes — SHA-256 hex digests ─────────────────
  @ApiProperty({ description: 'SHA-256 hash of selfie feature vector (hex)' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'selfieBiometricHash must be a 64-char hex SHA-256' })
  selfieBiometricHash: string;

  @ApiPropertyOptional({ description: 'SHA-256 hash of ID document photo feature vector' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'documentPhotoHash must be a 64-char hex SHA-256' })
  documentPhotoHash?: string;

  // ── Liveness result computed client-side ────────────────────
  @ApiProperty({ description: 'Client-side liveness detection results' })
  @ValidateNested()
  @Type(() => LivenessResultDto)
  liveness: LivenessResultDto;

  // ── Face match ─────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Face match score (selfie ↔ ID) 0–1' })
  @IsOptional() @IsNumber() @Min(0) @Max(1)
  faceMatchScore?: number;
}

// ═══════════════════════════════════════════════════════════════
// 2. Admin review
// ═══════════════════════════════════════════════════════════════

export class ReviewKycDto {
  @ApiProperty({ description: 'Wallet address of the user under review' })
  @IsString()
  @Matches(/^[A-Z2-7]{58}$/, { message: 'Invalid Algorand address' })
  walletAddress: string;

  @ApiProperty({ description: 'Approve or reject' })
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;

  @ApiProperty({ description: 'Admin wallet address making the decision' })
  @IsString()
  @Matches(/^[A-Z2-7]{58}$/, { message: 'Invalid Algorand address' })
  reviewerAddress: string;
}

// ═══════════════════════════════════════════════════════════════
// 3. Admin revoke KYC
// ═══════════════════════════════════════════════════════════════

export class RevokeKycDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[A-Z2-7]{58}$/, { message: 'Invalid Algorand address' })
  walletAddress: string;

  @ApiProperty()
  @IsString() @MaxLength(500)
  reason: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[A-Z2-7]{58}$/, { message: 'Invalid Algorand address' })
  reviewerAddress: string;
}
