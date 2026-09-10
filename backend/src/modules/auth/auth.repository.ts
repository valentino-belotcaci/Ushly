import { Prisma, type PrismaClient, type User } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { hashPassword } from '../../utils/password.js';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type CreateLocalUserInput = {
  email: string;
  password: string;
};

export async function createLocalUser(
  prisma: PrismaClient,
  input: CreateLocalUserInput,
): Promise<User> {
  // Hash before constructing Prisma data so raw passwords never reach the driver.
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: {
        email: normalizeEmail(input.email),
        passwordHash,
        provider: 'local',
        providerId: null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError('user_creation_failed', 'Unable to create user', 409);
    }
    throw error;
  }
}

export async function findUserByEmail(
  prisma: PrismaClient,
  email: string,
): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
}
