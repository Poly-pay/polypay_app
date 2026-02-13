import { PrismaService } from "@/database/prisma.service";
import { INestApplication } from "@nestjs/common";

/**
 * Truncate all tables in the test database
 * Order matters due to foreign key constraints
 * @param app - NestJS application instance
 */
export async function truncateAllTables(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  // Delete in order: child tables first
  await prisma.vote.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.accountSigner.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.pointHistory.deleteMany({});
  await prisma.claimHistory.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("All tables truncated");
}

/**
 * Get PrismaService from app
 * @param app - NestJS application instance
 */
export function getPrismaService(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}
