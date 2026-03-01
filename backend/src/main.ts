import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression = require('compression');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const helmet = require('helmet');

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // ── Global Prefix ──────────────────────────────────────────
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';
  const apiVersion = configService.get<string>('app.apiVersion') || 'v1';
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`, {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  // ── Security ───────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  // ── CORS ───────────────────────────────────────────────────
  const corsOrigins = configService.get<string[]>('app.corsOrigin') || [];
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── Swagger / OpenAPI ──────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AssetLinked API')
    .setDescription(
      'Algorand Asset Tokenization Platform — RESTful API\n\n' +
      '**Modules:** Auth, Wallet, Assets, Marketplace, Governance, Analytics, Storage\n\n' +
      `**Network:** ${configService.get<string>('algorand.network')?.toUpperCase()}`,
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter your wallet-issued JWT token',
    })
    .addTag('Health', 'Platform health checks')
    .addTag('Auth', 'Wallet-based authentication')
    .addTag('Wallet', 'Algorand network & account queries')
    .addTag('Assets', 'Tokenized asset management')
    .addTag('Marketplace', 'Asset listing & trading')
    .addTag('Governance', 'Proposal & voting system')
    .addTag('Analytics', 'Platform analytics & metrics')
    .addTag('Storage / IPFS', 'IPFS metadata storage via Pinata')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  // ── Start ──────────────────────────────────────────────────
  const port = configService.get<number>('app.port') || 3001;
  await app.listen(port);

  logger.log(`══════════════════════════════════════════════════`);
  logger.log(`  AssetLinked Backend is running`);
  logger.log(`  Port:      ${port}`);
  logger.log(`  Prefix:    /${apiPrefix}/${apiVersion}`);
  logger.log(`  Swagger:   http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`  Health:    http://localhost:${port}/health`);
  logger.log(`  Network:   ${configService.get<string>('algorand.network')?.toUpperCase()}`);
  logger.log(`  Env:       ${configService.get<string>('app.nodeEnv')}`);
  logger.log(`══════════════════════════════════════════════════`);
}

bootstrap();
