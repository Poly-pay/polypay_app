import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-admin-key'];

    const adminApiKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!adminApiKey) {
      throw new UnauthorizedException('Admin API key not configured');
    }

    if (!apiKey || apiKey !== adminApiKey) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }
}
