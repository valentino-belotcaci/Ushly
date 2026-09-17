import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { findRedirectTarget } from './redirect.repository.js';
import {
  getCachedRedirect,
  setCachedRedirect,
} from './redirect.cache.js';

import type { RedisClientType } from 'redis';

export async function getRedirectTarget(
  prisma: PrismaClient,
  redis: RedisClientType,
  shortCode: string,
): Promise<string> {
  const cachedDestination = await getCachedRedirect(redis, shortCode);
  //found in cache, return the url
  if (cachedDestination !== null) return cachedDestination;

  //not found in cache, check the database
  const link = await findRedirectTarget(prisma, shortCode);

  if (
    !link ||
    link.status !== 'active' ||
    (link.expiresAt !== null && link.expiresAt.getTime() <= Date.now())
  ) {
    throw new AppError('link_not_found', 'Link not found', 404);
  }

  await setCachedRedirect(
    redis,
    shortCode,
    link.destinationUrl,
    link.status,
    link.expiresAt,
  );
  return link.destinationUrl;
}
