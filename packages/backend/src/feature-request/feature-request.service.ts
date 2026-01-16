import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateFeatureRequestDto } from '@polypay/shared';

@Injectable()
export class FeatureRequestService {
  private readonly logger = new Logger(FeatureRequestService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFeatureRequestDto) {
    const featureRequest = await this.prisma.featureRequest.create({
      data: {
        content: dto.content,
      },
    });

    this.logger.log(`Created feature request: ${featureRequest.id}`);
    return featureRequest;
  }

  async findAll() {
    return this.prisma.featureRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
