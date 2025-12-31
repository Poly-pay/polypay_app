import { PrismaService } from "@/database/prisma.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "your-secret-key",
    });
  }

  async validate(payload: { sub: string }) {
    const account = await this.prisma.account.findUnique({
      where: { commitment: payload.sub },
    });

    if (!account) {
      throw new UnauthorizedException("Account not found");
    }

    return { commitment: payload.sub, accountId: account.id };
  }
}