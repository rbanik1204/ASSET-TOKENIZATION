import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum AlgorandNetwork {
  TestNet = 'testnet',
  MainNet = 'mainnet',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsEnum(AlgorandNetwork)
  ALGORAND_NETWORK: AlgorandNetwork;

  @IsString()
  ALGORAND_ALGOD_URL: string;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_DATABASE: string;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsString()
  JWT_SECRET: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('\n')}`,
    );
  }
  return config;
}
