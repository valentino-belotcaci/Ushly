import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../errors/app-error.js';
import { changeSession, createSession } from './refresh.repository.js';

const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const valid = (token: string | undefined): token is string =>
  typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
const unavailable = () =>
  new AppError('internal_server_error', 'An unexpected error occurred', 500);

export async function startSession(
  prisma: PrismaClient,
  userId: string,
  maxAgeMs: number,
) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + maxAgeMs);
  try {
    await createSession(prisma, userId, hash(token), expiresAt);
  } catch {
    throw unavailable();
  }
  return { token, expiresAt };
}

export async function refreshSession(
  prisma: PrismaClient,
  oldToken: string | undefined,
) {
  const token = randomBytes(32).toString('base64url');
  let session = null;
  if (valid(oldToken)) {
    try {
      session = await changeSession(prisma, hash(oldToken), hash(token));
    } catch {
      throw unavailable();
    }
  }
  if (!session)
    throw new AppError('unauthorized', 'Authentication required', 401);
  return { ...session, token };
}

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
