import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { createLocalUser, findUserByEmail } from './auth.repository.js';//db functions
import type { RegisterBody } from './auth.schemas.js';

//registers a new user in the database, hashes the password and returns the user data
export async function registerUser(prisma: PrismaClient, input: RegisterBody) {//prismaClient to access db in repository
  const email = input.email.trim().toLowerCase();
  try {
    const passwordHash = await hashPassword(input.password);//hash password
    const user = await createLocalUser(prisma, { email, passwordHash });//create user in the database with the hashed password
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

  let user;//found user

  try {
    user = await findUserByEmail(prisma, input.email.trim().toLowerCase());
  } catch {
    throw new AppError(
      'internal_server_error',
      'An unexpected error occurred',
      500,
    );
  }
  //verifies if the password is correct, even if the user is not found, to avoid timing attacks that could reveal if the user exists or not
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  //login fails if the user is not found, or if the user is not a local user, or if the password is not correct
  if (!user || user.provider !== 'local' || !user.passwordHash || !valid || user.disabledAt !== null) {
    throw new AppError('invalid_credentials', 'Invalid email or password', 401);
  }
  let googleLinkEligible: boolean;
  try {
    googleLinkEligible = (await prisma.userIdentity.count({
      where: { userId: user.id, provider: 'google' },
    })) === 0;
  } catch {
    throw new AppError('internal_server_error', 'An unexpected error occurred', 500);
  }
  //return user data to the client, without the password hash
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    googleLinkEligible,
  };
}
