import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ArcAuthService } from './arc-auth.service';
import { ArcNonceDto } from './dto/arc-nonce.dto';
import { ArcLoginDto } from './dto/arc-login.dto';

@ApiTags('arc-auth')
@Controller('arc/auth')
@UseGuards(ThrottlerGuard)
export class ArcAuthController {
  constructor(private readonly arcAuthService: ArcAuthService) {}

  /**
   * Issue a login nonce for a wallet address
   * POST /api/arc/auth/nonce
   */
  @Post('nonce')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({
    summary: 'Get a login nonce for an Arc wallet address',
    description:
      'Returns a one-time nonce that must be signed (as `PolyPay Arc login: <nonce>`) and submitted to /arc/auth/login.',
  })
  @ApiBody({ type: ArcNonceDto })
  @ApiResponse({
    status: 201,
    description: 'Nonce issued',
    schema: { type: 'object', properties: { nonce: { type: 'string' } } },
  })
  async nonce(@Body() dto: ArcNonceDto) {
    return { nonce: this.arcAuthService.getNonce(dto.address) };
  }

  /**
   * Login by proving ownership of an Arc wallet address via signature
   * POST /api/arc/auth/login
   */
  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Login with an Arc wallet signature',
    description:
      'Authenticate by signing the nonce previously issued by /arc/auth/nonce. Returns an access token.',
  })
  @ApiBody({ type: ArcLoginDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully authenticated',
    schema: { type: 'object', properties: { accessToken: { type: 'string' } } },
  })
  @ApiResponse({ status: 401, description: 'Invalid signature or nonce' })
  async login(@Body() dto: ArcLoginDto) {
    return this.arcAuthService.login(dto.address, dto.signature);
  }
}
