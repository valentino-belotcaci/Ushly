import type { FastifyReply, FastifyRequest } from 'fastify';

import { createLinkService } from './link.service.js';
import type { CreateLinkBody } from './link.schemas.js';

export async function createLinkController(
  request: FastifyRequest<{ Body: CreateLinkBody }>,
  reply: FastifyReply,
) {
  const userId = request.authenticatedUser?.id ?? null;
  const link = await createLinkService(request.server.prisma, userId, request.body);
  return reply.code(201).send(link);
}
