import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateUserDto, UpdateUserDto } from '@polypay/shared';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new account
   */
  async create(dto: CreateUserDto) {
    // Check if account already exists
    const existing = await this.prisma.user.findUnique({
      where: { commitment: dto.commitment, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const user = await this.prisma.user.create({
      data: { commitment: dto.commitment },
    });

    this.logger.log(`Created account: ${user.id}`);
    return user;
  }

  /**
   * Get user by commitment
   */
  async findByCommitment(commitment: string) {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get accounts for user
   */
  async getAccounts(commitment: string) {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
      include: {
        accounts: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!user) {
      // Return empty array if user doesn't exist yet
      return [];
    }

    return user.accounts.map((aw) => ({
      ...aw.account,
      isCreator: aw.isCreator,
    }));
  }

  /**
   * Upsert user (create if not exists)
   */
  async upsert(commitment: string) {
    return this.prisma.user.upsert({
      where: { commitment },
      create: { commitment },
      update: {},
    });
  }

  async update(commitment: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { commitment },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { commitment },
      data: {
        name: dto.name,
      },
    });
  }

  async findAll() {
    return this.prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
