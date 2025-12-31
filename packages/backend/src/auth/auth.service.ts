import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ZkVerifyService } from '@/zkverify/zkverify.service';
import { LoginDto, RefreshDto } from '@polypay/shared';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly zkVerifyService: ZkVerifyService,
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
        await this.zkVerifyService.submitProofAndWaitFinalized({
          proof: dto.proof,
          publicInputs: dto.publicInputs,
          vk: dto.vk,
        });

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

    // 3. Generate tokens
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
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
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
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
