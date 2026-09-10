import type { FastifyReply, FastifyRequest } from 'fastify';

import type { RegisterBody } from './auth.schemas.js';
import { registerUser } from './auth.service.js';

export async function registerController(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) {
  const user = await registerUser(request.server.prisma, request.body);
  return reply.code(201).send(user);
}
