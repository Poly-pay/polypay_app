import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import databaseConfig from './database.config';
import appConfig from './app.config';
import jwtConfig from './jwt.config';
import relayerConfig from './relayer.config';
import { validationSchema } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, relayerConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
      validationSchema: validationSchema,
      validationOptions: {
        abortEarly: false, // Show all validation errors
        allowUnknown: true, // Allow env vars not in schema
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
