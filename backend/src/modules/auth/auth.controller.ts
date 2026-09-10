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

export async function loginController(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) {
  const user = await loginUser(request.server.prisma, request.body);
  const accessToken = await reply.jwtSign({ sub: user.id });
  return reply.header('Cache-Control', 'no-store').send({ accessToken, user });
}
