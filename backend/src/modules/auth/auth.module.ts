import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';
import { AuthNonce } from './entities/auth-nonce.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthNonce])],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    // Register as global guard — every route requires auth unless @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
