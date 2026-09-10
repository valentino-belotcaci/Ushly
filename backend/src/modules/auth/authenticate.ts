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
  }
  interface FastifyRequest {
    authenticatedUser: { id: string } | null;
  }
}

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
