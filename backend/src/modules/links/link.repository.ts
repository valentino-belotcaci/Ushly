import type { PrismaClient } from '@prisma/client';

import { createWithUniqueShortCode } from './short-code.js';

type CreateLinkInput = {
  userId: string | null;
  destinationUrl: string;
  title?: string | undefined;
  expiresAt?: Date | undefined;
};

export async function createLink(
  prisma: PrismaClient,
  input: CreateLinkInput,
) {
  return createWithUniqueShortCode((shortCode) =>
    prisma.link.create({
      data: {
        userId: input.userId,
        shortCode,
        destinationUrl: input.destinationUrl,
        title: input.title ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    }),
  );
}
