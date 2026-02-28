import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  apiVersion: process.env.API_VERSION || 'v1',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim()),
}));

export const algorandConfig = registerAs('algorand', () => {
  const network = process.env.ALGORAND_NETWORK || 'testnet';
  const isMainnet = network === 'mainnet';
  return {
    network,
    isMainnet,
    algod: {
      url: process.env.ALGORAND_ALGOD_URL ||
        (isMainnet
          ? 'https://mainnet-api.algonode.cloud'
          : 'https://testnet-api.algonode.cloud'),
      token: process.env.ALGORAND_ALGOD_TOKEN || '',
      port: parseInt(process.env.ALGORAND_ALGOD_PORT || '443', 10),
    },
    indexer: {
      url: process.env.ALGORAND_INDEXER_URL ||
        (isMainnet
          ? 'https://mainnet-idx.algonode.cloud'
          : 'https://testnet-idx.algonode.cloud'),
      token: process.env.ALGORAND_INDEXER_TOKEN || '',
      port: parseInt(process.env.ALGORAND_INDEXER_PORT || '443', 10),
    },
    admin: {
      mnemonic: process.env.ADMIN_ALGORAND_MNEMONIC || '',
      address: process.env.ADMIN_ALGORAND_ADDRESS || '',
    },
    contracts: {
      verificationAppId: process.env.VERIFICATION_APP_ID
        ? parseInt(process.env.VERIFICATION_APP_ID, 10)
        : null,
      incomeAppId: process.env.INCOME_APP_ID
        ? parseInt(process.env.INCOME_APP_ID, 10)
        : null,
      governanceAppId: process.env.GOVERNANCE_APP_ID
        ? parseInt(process.env.GOVERNANCE_APP_ID, 10)
        : null,
    },
  };
});

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'assetlinked',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
}));

export const ipfsConfig = registerAs('ipfs', () => ({
  provider: process.env.IPFS_PROVIDER || 'pinata',
  pinata: {
    apiKey: process.env.PINATA_API_KEY || '',
    secretKey: process.env.PINATA_SECRET_KEY || '',
    gateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs',
  },
}));

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION || '86400', 10),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
}));
