import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { hashPassword } from '../../utils/password.js';
import { createLocalUser } from './auth.repository.js';
import type { RegisterBody } from './auth.schemas.js';

export async function registerUser(prisma: PrismaClient, input: RegisterBody) {
  const email = input.email.trim().toLowerCase();
  try {
    const passwordHash = await hashPassword(input.password);
    const user = await createLocalUser(prisma, { email, passwordHash });
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError && error.code === 'user_creation_failed')
      throw error;
    // Prisma diagnostics can embed query arguments, including hashes. Do not pass
    // those errors to the global logger or attach them as an error cause.
    throw new AppError(
      'internal_server_error',
      'An unexpected error occurred',
      500,
    );
  }
}
