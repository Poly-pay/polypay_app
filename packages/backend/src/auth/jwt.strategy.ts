import { CONFIG_KEYS } from '@/config/config.keys';
import { PrismaService } from '@/database/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(CONFIG_KEYS.JWT_SECRET),
    });
  }

  async validate(payload: { sub: string }) {
    const account = await this.prisma.account.findUnique({
      where: { commitment: payload.sub },
    });

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    return { commitment: payload.sub, accountId: account.id };
  }
}
