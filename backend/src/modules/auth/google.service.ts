import type { PrismaClient } from '@prisma/client';
import type { OAuth2Client } from 'google-auth-library';
import type { GoogleOAuthConfig } from '../../config/env.js';
import type { GoogleTransaction } from './google.state.js';
import { exchangeIdentity } from './google.provider.js';
import { startSession } from './refresh.service.js';
import { verifyPassword } from '../../utils/password.js';
import { linkingUser, resolveGoogleUser } from './google.repository.js';
import { digest, oauthFailure } from './google.state.js';

export async function confirmLink(
  prisma: PrismaClient,
  userId: string,
  password: string,
) {
  const user = await linkingUser(prisma, userId);
  if (
    !user ||
    user.provider !== 'local' ||
    !user.passwordHash ||
    user.disabledAt !== null ||
    !(await verifyPassword(password, user.passwordHash))
  )
    throw oauthFailure();
  return { userId: user.id, passwordFingerprint: digest(user.passwordHash) };
}

export async function completeGoogleAuthentication(
  prisma: PrismaClient,
  client: OAuth2Client,
  config: GoogleOAuthConfig,
  code: string,
  transaction: GoogleTransaction,
  sessionMaxAgeMs: number,
) {
  const identity = await exchangeIdentity(client, config, code, transaction);
  const user = await resolveGoogleUser(prisma, identity, transaction.link);
  return startSession(prisma, user.id, sessionMaxAgeMs);
}
