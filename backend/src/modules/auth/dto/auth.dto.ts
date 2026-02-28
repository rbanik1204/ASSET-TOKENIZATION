import { IsString, IsNotEmpty, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

/** POST /auth/nonce — request a challenge nonce */
export class RequestNonceDto {
  @ApiProperty({
    description: 'Algorand wallet address (58 characters)',
    example: 'CZBNQWHGVNNRRMSDTJPZVFGQY6QDEVGVTAX77H745WJAKQCZAHPJJ7HE6A',
  })
  @IsString()
  @IsNotEmpty()
  @Length(58, 58, { message: 'Algorand address must be exactly 58 characters' })
  address: string;
}

/** POST /auth/verify — submit signed nonce to get JWT */
export class VerifySignatureDto {
  @ApiProperty({ description: 'Algorand wallet address' })
  @IsString()
  @IsNotEmpty()
  @Length(58, 58)
  address: string;

  @ApiProperty({ description: 'Base64-encoded signature bytes from wallet' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'The nonce that was signed (hex, 64 chars)' })
  @IsString()
  @IsNotEmpty()
  nonce: string;
}

/** POST /auth/refresh — exchange refresh token for new access token */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/** PATCH /auth/role — admin changes a user role */
export class UpdateRoleDto {
  @ApiProperty({ description: 'Wallet address of the target user' })
  @IsString()
  @IsNotEmpty()
  @Length(58, 58)
  targetAddress: string;

  @ApiProperty({ description: 'New role', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

/** Auth response */
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  address: string;
  role: string;
  network: string;
}
