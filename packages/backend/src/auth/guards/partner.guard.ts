import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class PartnerGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-partner-key'] as string | undefined;

    const partnerApiKey = this.configService.get<string>('PARTNER_API_KEY');

    if (!partnerApiKey) {
      throw new UnauthorizedException('Partner API key not configured');
    }

    if (
      !apiKey ||
      apiKey.length !== partnerApiKey.length ||
      !timingSafeEqual(Buffer.from(apiKey), Buffer.from(partnerApiKey))
    ) {
      throw new UnauthorizedException('Invalid partner API key');
    }

    return true;
  }
}
