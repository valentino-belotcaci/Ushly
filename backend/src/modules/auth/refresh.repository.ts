import type { PrismaClient, RefreshToken } from '@prisma/client';

export async function createSession(
  prisma: PrismaClient,
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
}

export async function changeSession(
  prisma: PrismaClient,
  tokenHash: string,
  replacementHash?: string,
) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.refreshToken.findUnique({ where: { tokenHash } });
    if (!found) return null;
    // Serialize rotation/logout across every chain belonging to this user. Read
    // token state again after acquiring the lock, so concurrent replay is visible.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${found.userId} FOR UPDATE`;
    const token = await tx.refreshToken.findUnique({ where: { id: found.id } });
    if (!token) return null;
    const now = new Date();
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
    const next = await tx.refreshToken.create({
      data: {
        userId: token.userId,
        tokenHash: replacementHash,
        expiresAt: token.expiresAt,
      },
    });
    await tx.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: now, replacedByTokenId: next.id },
    });
    return { userId: token.userId, expiresAt: token.expiresAt };
  });
}
