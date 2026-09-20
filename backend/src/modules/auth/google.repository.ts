import { Prisma, type PrismaClient } from '@prisma/client';
import { AppError } from '../../errors/app-error.js';
import type { GoogleIdentity } from './google.provider.js';
import { digest, oauthFailure, type LinkConfirmation } from './google.state.js';

export const linkingUser = (prisma: PrismaClient, id: string) =>
  prisma.user.findUnique({ where: { id } });
const conflict = () =>
  new AppError(
    'oauth_conflict',
    'Unable to use this Google identity; sign in with your existing method',
    409,
  );

export async function resolveGoogleUser(
  prisma: PrismaClient,
  identity: GoogleIdentity,
  link: LinkConfirmation | null,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.userIdentity.findUnique({
        where: {
          provider_providerId: {
            provider: 'google',
            providerId: identity.subject,
          },
        },
      });
      if (link || existing) {
        const userId = link?.userId ?? existing?.userId;
        if (!userId) throw oauthFailure();
        // Share the user lock with administrative disabling and refresh-session rotation.
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.disabledAt !== null) throw oauthFailure();
        if (
          link &&
          (user.provider !== 'local' ||
            !user.passwordHash ||
            digest(user.passwordHash) !== link.passwordFingerprint)
        )
          throw oauthFailure();
        if (existing) {
          if (existing.userId !== userId) throw conflict();
          if (existing.email !== identity.email) throw oauthFailure();
          return user;
        }
        // Explicit linking may use a different Google email, but cannot absorb another account.
        const emailOwner = await tx.user.findUnique({
          where: { email: identity.email },
        });
        if (emailOwner && emailOwner.id !== user.id) throw conflict();
        await tx.userIdentity.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerId: identity.subject,
            email: identity.email,
          },
        });
        return user;
      }
      if (await tx.user.findUnique({ where: { email: identity.email } }))
        throw conflict();
      return tx.user.create({
        data: {
          email: identity.email,
          provider: 'google',
          providerId: identity.subject,
          passwordHash: null,
          identities: {
            create: {
              provider: 'google',
              providerId: identity.subject,
              email: identity.email,
            },
          },
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw conflict();
    throw error;
  }
}
