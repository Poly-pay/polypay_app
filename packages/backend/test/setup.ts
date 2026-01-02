import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { truncateAllTables } from "./utils/cleanup.util";

let app: INestApplication;

/**
 * Setup NestJS application for E2E testing
 * @returns NestJS application instance
 */
export async function setupTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  // Apply same pipes as production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  // Set global prefix
  app.setGlobalPrefix("api");

  await app.init();

  return app;
}

/**
 * Get current test app instance
 */
export function getTestApp(): INestApplication {
  if (!app) {
    throw new Error("Test app not initialized. Call setupTestApp() first.");
  }
  return app;
}

/**
 * Get HTTP server for supertest
 */
export function getHttpServer() {
  if (!app) {
    throw new Error("Test app not initialized. Call setupTestApp() first.");
  }
  return app.getHttpServer();
}

/**
 * Cleanup after all tests
 */
export async function teardownTestApp(): Promise<void> {
  if (app) {
    await app.close();
  }
}

/**
 * Reset database before each test
 */
export async function resetDatabase(): Promise<void> {
  if (!app) {
    throw new Error("Test app not initialized. Call setupTestApp() first.");
  }
  await truncateAllTables(app);
}
