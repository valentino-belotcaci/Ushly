import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { findRedirectTarget } from './redirect.repository.js';

export async function getRedirectTarget(
  prisma: PrismaClient,
  shortCode: string,
): Promise<string> {
  const link = await findRedirectTarget(prisma, shortCode);

  if (
    !link ||
    link.status !== 'active' ||
    (link.expiresAt !== null && link.expiresAt.getTime() <= Date.now())
  ) {
    throw new AppError('link_not_found', 'Link not found', 404);
  }

  return link.destinationUrl;
}
