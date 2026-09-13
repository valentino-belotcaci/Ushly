import type { EnvironmentConfig } from '../../config/env.js';
import { startSession } from './refresh.service.js';
import { sessionCookie } from './refresh.controller.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { RegisterBody } from './auth.schemas.js';
import { registerUser, loginUser } from './auth.service.js';

export async function registerController(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) {
  const user = await registerUser(request.server.prisma, request.body);
  return reply.code(201).send(user);
}

export function loginController(env: EnvironmentConfig) {
  return async function (
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply,
  ) {
    const user = await loginUser(request.server.prisma, request.body);
    const accessToken = await reply.jwtSign({ sub: user.id });
    const session = await startSession(
      request.server.prisma,
      user.id,
      env.cookie.maxAgeMs,
    );
    reply.setCookie(env.cookie.name, session.token, {
      ...sessionCookie(env),
      expires: session.expiresAt,
    });
    return reply
      .header('Cache-Control', 'no-store')
      .send({ accessToken, user });
  };
}
