import type { FastifyReply, FastifyRequest } from 'fastify';
import type { EnvironmentConfig } from '../../config/env.js';
import { endSession, refreshSession } from './refresh.service.js';

export function sessionCookie(env: EnvironmentConfig) {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production' || env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/auth',
  };
}

export function refreshControllers(env: EnvironmentConfig) {
  const clear = (reply: FastifyReply) =>
    reply.clearCookie(env.cookie.name, sessionCookie(env));
  return {
    refresh: async (request: FastifyRequest, reply: FastifyReply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        const session = await refreshSession(
          request.server.prisma,
          request.cookies[env.cookie.name],
        );
        const accessToken = await reply.jwtSign({ sub: session.userId });
        reply.setCookie(env.cookie.name, session.token, {
          ...sessionCookie(env),
          expires: session.expiresAt,
        });
        return reply.send({ accessToken });
      } catch (error) {
        clear(reply);
        throw error;
      }
    },
    logout: async (request: FastifyRequest, reply: FastifyReply) => {
      reply.header('Cache-Control', 'no-store');
      clear(reply);
      await endSession(request.server.prisma, request.cookies[env.cookie.name]);
      return reply.code(204).send();
    },
  };
}
