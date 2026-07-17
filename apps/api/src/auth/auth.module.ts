import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: (process.env.JWT_ACCESS_SECRET ?? 'dev-secret-change-me-min-32-chars').trim(),
        signOptions: {
          expiresIn: ((process.env.JWT_ACCESS_EXPIRES_IN ?? '15m').trim() || '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
