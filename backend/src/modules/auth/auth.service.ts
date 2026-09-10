import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { createLocalUser, findUserByEmail } from './auth.repository.js';
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

// Public, non-account hash with the same cost as real passwords. It avoids the
// obvious fast path for an unknown email or an account without a local password.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=1,t=3$0vjEjA7oOhZb0+9rrBagSA$g95yXTNnqAXaIHpkgBc2Ang7BaVVzRxK2Cxu23qECTA';

export async function loginUser(prisma: PrismaClient, input: RegisterBody) {
  let user;
  try {
    user = await findUserByEmail(prisma, input.email.trim().toLowerCase());
  } catch {
    throw new AppError(
      'internal_server_error',
      'An unexpected error occurred',
      500,
    );
  }
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || user.provider !== 'local' || !user.passwordHash || !valid) {
    throw new AppError('invalid_credentials', 'Invalid email or password', 401);
  }
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
