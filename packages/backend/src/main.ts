import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API prefix
  const apiPrefix = configService.get<string>('app.apiPrefix');
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('PolyPay API')
    .setDescription(
      'Privacy-preserving payroll API with zero-knowledge proofs and multi-signature accounts support.\n\n' +
        '## Features\n' +
        '- **Zero-Knowledge Privacy**: Private multi-signature approvals using Noir circuits\n' +
        '- **Multi-signature Accounts**: Secure transaction voting and approval system\n' +
        '- **Real-time Updates**: WebSocket support for live notifications\n' +
        '- **JWT Authentication**: Secure token-based authentication\n\n' +
        '## Getting Started\n' +
        '1. Authenticate via `/api/auth/login` to get your JWT token\n' +
        '2. Click the "Authorize" button and enter your token\n' +
        '3. Explore and test endpoints organized by feature tags below\n\n' +
        '## Resources\n' +
        '- **Documentation**: https://q3labs.gitbook.io/polypay\n' +
        '- **GitHub**: https://github.com/Poly-pay/polypay_app\n' +
        '- **Support**: Create an issue on GitHub',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints - Login and token refresh')
    .addTag(
      'users',
      'User management - User accounts with ZK commitments',
    )
    .addTag('accounts', 'Account operations - Multi-signature account management')
    .addTag(
      'transactions',
      'Transaction management - Create, vote, and execute transactions',
    )
    .addTag('batch-items', 'Batch processing - Manage batch transaction items')
    .addTag('contact-book', 'Contact book - Contact and group management')
    .addTag(
      'notifications',
      'Notification system - Real-time notifications and updates',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = `${apiPrefix || ''}/swagger`;
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('app.port');
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(
    `📚 Swagger documentation available at: http://localhost:${port}/${swaggerPath}`,
  );
}

void bootstrap();
