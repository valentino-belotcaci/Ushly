import type { preHandlerAsyncHookHandler } from 'fastify';
import { AppError } from '../../errors/app-error.js';

export type AccessTokenPayload = { sub: string };

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: preHandlerAsyncHookHandler;
    requireAdmin: preHandlerAsyncHookHandler;
  }
  interface FastifyRequest {
    authenticatedUser: { id: string } | null;
  }
}
//This function is an authorization guard for admin-only routes
//A pre-handler runs before the actual controller.
export const requireAdmin: preHandlerAsyncHookHandler = async (request) => {
  const userId = request.authenticatedUser?.id;
  if (!userId) {
    throw new AppError('unauthorized', 'Authentication required', 401);
  }

  const user = await request.server.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {//dont know who the user is
    throw new AppError('unauthorized', 'Authentication required', 401);
  }
  if (user.role !== 'ADMIN') {//know who the user is
    throw new AppError('forbidden', 'Admin access required', 403);
  }
};

export const authenticate: preHandlerAsyncHookHandler = async (request) => {
  request.authenticatedUser = null;
  try {
    const claims: unknown = await request.jwtVerify();
    if (
      !claims ||
      typeof claims !== 'object' ||
      !('sub' in claims) ||
      typeof claims.sub !== 'string' ||
      claims.sub.trim() === '' ||
      !('iat' in claims) ||
      typeof claims.iat !== 'number' ||
      !Number.isInteger(claims.iat) ||
      !('exp' in claims) ||
      typeof claims.exp !== 'number' ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= claims.iat
    ) {
      throw new Error('Invalid access token claims');
    }
    request.authenticatedUser = { id: claims.sub };
  } catch {
    // Never log the original verifier error or attach token data as a cause.
    throw new AppError('unauthorized', 'Authentication required', 401);
  }
};
