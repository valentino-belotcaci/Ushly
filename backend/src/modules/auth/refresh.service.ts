import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../errors/app-error.js';
import { changeSession, createSession } from './refresh.repository.js';

//server saves the hash of the refresh token in the database, not the token itself. 
// This way, if the database is compromised, the attacker cannot use the stolen hashes 
// to generate valid refresh tokens.
const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

//verifies if the token is a valid refresh token, which is a string of 43 characters consisting 
// of uppercase and lowercase letters, digits, hyphens, and underscores.
const valid = (token: string | undefined): token is string =>
  typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);

//returns an AppError with a generic message to avoid leaking information about the error
const unavailable = () =>
  new AppError('internal_server_error', 'An unexpected error occurred', 500);

//when user logs in, a new refresh token is generated and stored in the database, 
// and the token itself is returned to the client to be stored in an httpOnly cookie.
export async function startSession(
  prisma: PrismaClient,
  userId: string,
  maxAgeMs: number,
) {
  const token = randomBytes(32).toString('base64url');//new random refresh token
  const expiresAt = new Date(Date.now() + maxAgeMs);//calculates expiration date
  try {
    await createSession(prisma, userId, hash(token), expiresAt); //saves the hash of the token in the database
  } catch {
    throw unavailable();
  }
  return { token, expiresAt };//gives the original token to the client, not the hash, 
                                //so it can be stored in an httpOnly cookie
}

export async function refreshSession(
  prisma: PrismaClient,
  oldToken: string | undefined,
) {
  const token = randomBytes(32).toString('base64url');//prepares new random refresh token to replace the old one
  let session = null;

  //passes to repository the hash of old token and the hash of new token, 
  // so the repository can find the old session and replace it with the new one
  if (valid(oldToken)) {
    try {
      session = await changeSession(prisma, hash(oldToken), hash(token));
    } catch {
      throw unavailable();
    }
  }
  if (!session)
    throw new AppError('unauthorized', 'Authentication required', 401);
  return { ...session, token };//return userid, expiration date, and the new refresh 
                              //token to be stored in the httpOnly cookie
}

//for logout, the refresh token is invalidated in the database,
//  so it can no longer be used to refresh the access token.
export async function endSession(
  prisma: PrismaClient,
  token: string | undefined,
) {
  if (!valid(token)) return;
  try {
    await changeSession(prisma, hash(token));
  } catch {
    throw unavailable();
  }
}
