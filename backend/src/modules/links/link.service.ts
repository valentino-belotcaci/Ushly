import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { validateDestinationUrl } from './link.validation.js';
import { createLink } from './link.repository.js';
import type { CreateLinkBody, CreateLinkResponse } from './link.schemas.js';

export async function createLinkService(
  prisma: PrismaClient,
  userId: string | null,//authenticated user id or null for anonymous users
  input: CreateLinkBody,
): Promise<CreateLinkResponse> {
  const destinationUrl = validateDestinationUrl(input.url);

  const expiresAt = input.expiresAt === undefined ? undefined : new Date(input.expiresAt);

  if (//if the expiration is provided, it must be a valid date in the future
    expiresAt !== undefined &&
    (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())
  ) {
    throw new AppError('invalid_expiration', 'The expiration must be in the future', 422);
  }

  try {
    const link = await createLink(prisma, {
      userId,
      destinationUrl,
      title: input.title,
      expiresAt,
    });
    return {
      id: link.id,
      shortCode: link.shortCode,
      destinationUrl: link.destinationUrl,
      title: link.title,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      status: 'active',
      createdAt: link.createdAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('internal_server_error', 'An unexpected error occurred', 500);
  }
}
