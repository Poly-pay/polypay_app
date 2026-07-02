import { CONFIG_KEYS } from '@/config/config.keys';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Mirrors JwtStrategy, but Arc users are not persisted as User rows keyed by
// commitment (that only happens in the account-creation flow). The token's
// chainType claim is the source of truth here; no DB lookup is performed.
@Injectable()
export class ArcJwtStrategy extends PassportStrategy(Strategy, 'arc-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(CONFIG_KEYS.JWT_SECRET),
    });
  }

  async validate(payload: { sub: string; chainType?: string }) {
    if (payload.chainType !== 'ecdsa') {
      throw new UnauthorizedException('Not an Arc (ecdsa) token');
    }

    return { address: payload.sub };
  }
}
