import { PrismaService } from 'src/db/prisma.service';

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "NotificationAttempt", "TaskAssignment", "IdempotencyKey", "Task", "User" RESTART IDENTITY CASCADE',
  );
}
