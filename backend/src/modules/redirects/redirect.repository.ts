import type { PrismaClient } from '@prisma/client';

export async function findRedirectTarget(
  prisma: PrismaClient,
  shortCode: string,
) {
  return prisma.link.findUnique({
    where: { shortCode },
    select: {
      destinationUrl: true,
      status: true,
      expiresAt: true,
    },
  });
}
