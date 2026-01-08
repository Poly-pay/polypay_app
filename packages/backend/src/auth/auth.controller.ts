import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from '@polypay/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login with ZK proof
   * POST /api/auth/login
   */
  @Post('login')
  @ApiOperation({
    summary: 'Login with zero-knowledge proof',
    description:
      'Authenticate user using a zero-knowledge proof. Returns access token and refresh token.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials with ZK proof',
    examples: {
      example1: {
        summary: 'Example login request',
        value: {
          commitment:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          proof: [47, 5, 66, 187, 'etc...'],
          publicInputs: ['0x084c2de....'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIweDEyMzQiLCJpYXQiOjE3MDk1NTAwMDB9.abc123',
        },
        refreshToken: {
          type: 'string',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIweDEyMzQiLCJpYXQiOjE3MDk1NTAwMDB9.def456',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or proof',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Get a new access token using a valid refresh token. Use this when your access token expires.',
  })
  @ApiBody({
    type: RefreshDto,
    description: 'Refresh token',
    examples: {
      example1: {
        summary: 'Example refresh request',
        value: {
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIweDEyMzQiLCJpYXQiOjE3MDk1NTAwMDB9.def456',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'New access token generated',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIweDEyMzQiLCJpYXQiOjE3MDk1NTEwMDB9.xyz789',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }
}
