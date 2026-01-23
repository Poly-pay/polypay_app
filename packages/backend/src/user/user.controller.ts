import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '@/generated/prisma/client';

@ApiTags('users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  /**
   * Test CICD Migration
   * GET /api/users/test-cicd-migration
   * This endpoint tests if the new field exists in the database
   */
  @Get('test-cicd-migration')
  @ApiOperation({
    summary: 'Test CICD Migration',
    description:
      'Test endpoint to verify if database migration was applied. Queries the new cicdTestField.',
  }) 
  @ApiResponse({ status: 200, description: 'Migration test successful' })
  @ApiResponse({
    status: 500,
    description: 'Migration not applied - column does not exist',
  })
  async testCicdMigration() {
    return this.userService.testCicdMigration();
  }

  /**
   * Create new user
   * POST /api/users
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Register a new user with a zero-knowledge commitment. This is the first step for new users.',
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      example1: {
        summary: 'Create new user',
        value: {
          commitment:
            '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User already exists',
  })
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  /**
   * Get current user
   * GET /api/users/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Retrieve the authenticated user details.',
  })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@CurrentUser() user: User) {
    return this.userService.findByCommitment(user.commitment);
  }

  /**
   * Get multisig accounts for current user
   * GET /api/users/me/accounts
   */
  @Get('me/accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get multisig accounts for current user',
    description:
      'Returns all multisig accounts where the authenticated user is a signer, including their role (creator or participant) in each account.',
  })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async getMyAccounts(@CurrentUser() user: User) {
    this.logger.log(`Fetching accounts for user: ${user.commitment}`);
    return this.userService.getAccounts(user.commitment);
  }

  /**
   * Update current user
   * PATCH /api/users/me
   */
  // @Patch('me')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth('JWT-auth')
  // @ApiOperation({
  //   summary: 'Update current user',
  //   description: 'Update the authenticated user information.',
  // })
  // @ApiBody({
  //   type: UpdateUserDto,
  //   examples: {
  //     example1: {
  //       summary: 'Update user name',
  //       value: {
  //         name: 'John Doe',
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({ status: 200, description: 'User updated successfully' })
  // @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  // @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  // @ApiResponse({ status: 404, description: 'User not found' })
  // async updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
  //   return this.userService.update(user.commitment, dto);
  // }

  /**
   * Get all users
   * GET /api/users
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a list of all registered users.',
  })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async findAll() {
    return this.userService.findAll();
  }
}
