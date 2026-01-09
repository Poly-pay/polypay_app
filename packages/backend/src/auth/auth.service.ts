import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ZkVerifyService } from '@/zkverify/zkverify.service';
import { LoginDto, RefreshDto } from '@polypay/shared';
import { PrismaService } from '@/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CONFIG_KEYS } from '@/config/config.keys';
import { AnalyticsLoggerService } from '@/common/analytics-logger.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly zkVerifyService: ZkVerifyService,
    private readonly configService: ConfigService,
    private readonly analyticsLogger: AnalyticsLoggerService,
  ) {}

  /**
   * Login with ZK proof
   */
  async login(dto: LoginDto) {
    const { commitment } = dto;

    // 1. Verify proof with zkVerify
    this.logger.log(`Verifying auth proof for commitment: ${commitment}`);

    try {
      const proofResult =
        await this.zkVerifyService.submitProofAndWaitFinalized(
          {
            proof: dto.proof,
            publicInputs: dto.publicInputs,
            vk: dto.vk,
          },
          'auth',
        );

      if (proofResult.status === 'Failed') {
        throw new BadRequestException('Proof verification failed');
      }
    } catch (error) {
      this.logger.error(`Proof verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid proof');
    }

    // 2. Find or create account
    let account = await this.prisma.account.findUnique({
      where: { commitment },
    });

    if (!account) {
      this.logger.log(`Creating new account for commitment: ${commitment}`);
      account = await this.prisma.account.create({
        data: { commitment },
      });
    }

    // 3. Analytics logging (isolated - NOT stored in database)
    if (dto.walletAddress) {
      this.analyticsLogger.logLogin(dto.walletAddress);
    }

    // 4. Generate tokens
    const tokens = this.generateTokens(commitment);

    this.logger.log(`Login successful for commitment: ${commitment}`);

    return {
      account,
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refresh(dto: RefreshDto) {
    const { refreshToken } = dto;

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>(CONFIG_KEYS.JWT_REFRESH_SECRET),
      });

      // Verify account exists
      const account = await this.prisma.account.findUnique({
        where: { commitment: payload.sub },
      });

      if (!account) {
        throw new UnauthorizedException('Account not found');
      }

      // Generate new tokens
      const tokens = this.generateTokens(payload.sub);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(commitment: string) {
    const payload = { sub: commitment };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(CONFIG_KEYS.JWT_SECRET),
      expiresIn: this.configService.get(CONFIG_KEYS.JWT_EXPIRES_IN),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(CONFIG_KEYS.JWT_REFRESH_SECRET),
      expiresIn: this.configService.get(CONFIG_KEYS.JWT_REFRESH_EXPIRES_IN),
    });

    return { accessToken, refreshToken };
  }
}
