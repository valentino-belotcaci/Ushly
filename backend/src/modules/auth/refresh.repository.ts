import type { PrismaClient, RefreshToken } from '@prisma/client';
import { AppError } from '../../errors/app-error.js';

export async function createSession(
  prisma: PrismaClient,
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  await prisma.$transaction(async (tx) => {
    // Disabling an account must also prevent a login already in progress from issuing a new session.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: userId }, select: { disabledAt: true },
    });
    if (!user || user.disabledAt !== null) {
      throw new AppError('unauthorized', 'Authentication required', 401);
    }
    await tx.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  });
}

export async function changeSession(
  prisma: PrismaClient,
  tokenHash: string,
  replacementHash?: string,
) {
  return prisma.$transaction(async (tx) => {

    //searches for the refresh token in the database using the hash of the token
    const found = await tx.refreshToken.findUnique({ where: { tokenHash } });
    //if it doesn't exist is not valid, so return null to indicate that the session could not be refreshed
    if (!found) return null;

    // Serialize rotation/logout across every chain belonging to this user. Read
    // token state again after acquiring the lock, so concurrent replay is visible.
    //prevents the creation of refresh tokens B and C when token A is being used to request a new refresh token twice at the same time,
    // so that if token A is used to request a new refresh token, and then token B is used to request a new
    // refresh token, the server will not create token C, because it will see that token A has already been used to create token B.

    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${found.userId} FOR UPDATE`;
    const token = await tx.refreshToken.findUnique({ where: { id: found.id } });
    if (!token) return null;
    const now = new Date();

    //refresh token reuse detection
    //if logout or token already used or token expired ,
    // revoke all descendants of the token and return null to indicate that the session could not be refreshed
    if (!replacementHash || token.revokedAt || token.expiresAt <= now) {
      // Old nodes are retained: replay must revoke the live descendant too.
      let nextId: string | null = token.id;
      while (nextId) {
        const revoked: Pick<RefreshToken, 'replacedByTokenId'> =
          await tx.refreshToken.update({
            where: { id: nextId },
            data: { revokedAt: now },
            select: { replacedByTokenId: true },
          });
        nextId = revoked.replacedByTokenId;
      }
      // Return instead of throwing: revocation must commit even on replay.
      return null;
    }

    //if the token is valid, create a new refresh token in the database 
    // with the hash of the new token and the same expiration date as the old one
    const next = await tx.refreshToken.create({
      data: {
        userId: token.userId,
        tokenHash: replacementHash,
        expiresAt: token.expiresAt,
      },
    }); 
    // update the old refresh token in the database to mark it as revoked and link it to the new refresh token
    await tx.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: now, replacedByTokenId: next.id },
    });

    const user = await tx.user.findUnique({
      where: { id: token.userId },
      select: {
        provider: true,
        passwordHash: true,
        disabledAt: true,
        identities: { where: { provider: 'google' }, select: { id: true }, take: 1 },
      },
    });
    // The flag describes account state only; the existing session rotation stays authoritative.
    const googleLinkEligible = user?.provider === 'local' &&
      user.passwordHash !== null && user.disabledAt === null &&
      user.identities.length === 0;
    return { userId: token.userId, expiresAt: token.expiresAt, googleLinkEligible };
  });
}
