import { Prisma, type PrismaClient, type User } from '@prisma/client';//to query the db 

import { AppError } from '../../errors/app-error.js';

function normalizeEmail(email: string): string {//removes spaces and converts to lowercase
  return email.trim().toLowerCase();
}

type CreateLocalUserInput = {
  email: string;
  passwordHash: string;
};

//creates a new user in the database with the given email and password hash, and returns the user data
export async function createLocalUser(
  prisma: PrismaClient,
  input: CreateLocalUserInput,
): Promise<User> {
  try {
    //creates a new user in the db
    return await prisma.user.create({
      data: {
        email: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        provider: 'local',//the provider is local because the user is created with email and password, 
                          // not with a third party provider like google or github
        providerId: null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'//checks if the error is a unique constraint violation, which means that the email is already in use
    ) {
      throw new AppError('user_creation_failed', 'Unable to create user', 409);
    }
    throw error;
  }
}

//search a user using the normalized email, and returns the user data if found, or null if not found
export async function findUserByEmail(
  prisma: PrismaClient,
  email: string,
): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
}
