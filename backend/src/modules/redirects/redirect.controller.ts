import type { FastifyReply, FastifyRequest } from 'fastify';

import { getRedirectTarget } from './redirect.service.js';

type RedirectParams = { shortCode: string };

export async function redirectController(
  request: FastifyRequest<{ Params: RedirectParams }>,
  reply: FastifyReply,
) {
  const destinationUrl = await getRedirectTarget(
    request.server.prisma,
    request.params.shortCode,
  );

  return reply.redirect(destinationUrl, 307);
}
