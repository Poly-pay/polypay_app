import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { CONFIG_KEYS } from '@/config/config.keys';
import { ArcAuthController } from './arc-auth.controller';
import { ArcAuthService } from './arc-auth.service';
import { ArcJwtStrategy } from './arc-jwt.strategy';
import { ArcAuthGuard } from './arc-auth.guard';

@Module({
  imports: [
    PassportModule,
    // Reuses the same JWT secret/expiry as the existing ZK auth module -
    // Arc tokens are distinguished by the chainType claim, not a separate secret.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(CONFIG_KEYS.JWT_SECRET),
        signOptions: {
          expiresIn: configService.get(CONFIG_KEYS.JWT_EXPIRES_IN),
        },
      }),
    }),
  ],
  controllers: [ArcAuthController],
  providers: [ArcAuthService, ArcJwtStrategy, ArcAuthGuard],
  exports: [ArcAuthService, ArcAuthGuard],
})
export class ArcAuthModule {}
