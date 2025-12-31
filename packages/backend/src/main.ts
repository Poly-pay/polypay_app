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
    .setDescription('API documentation for PolyPay application')
    .setVersion('1.0')
    .addTag('accounts', 'Account management endpoints')
    .addTag('wallets', 'Wallet management endpoints')
    .addTag('transactions', 'Transaction management endpoints')
    .addTag('batch-items', 'Batch item management endpoints')
    .addTag('address-book', 'Address book management endpoints')
    .addTag('notifications', 'Notification management endpoints')
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
