import type { FastifyReply, FastifyRequest } from 'fastify';

import { getRedirectTarget } from './redirect.service.js';
import { recordRedirectClick } from '../clicks/click.service.js';

type RedirectParams = { shortCode: string };

export async function redirectController(
  request: FastifyRequest<{ Params: RedirectParams }>,
  reply: FastifyReply,
) {
  const target = await getRedirectTarget(
    request.server.prisma,
    request.server.redis,
    request.params.shortCode,
  );

  try {
    await recordRedirectClick(request.server.prisma, {
      linkId: target.linkId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      referrer: request.headers.referer,
      ipHashSecret: request.server.env.ipHashSecret,
    });
  } catch {
    request.log.warn('Click tracking failed for redirect');
  }

  return reply.redirect(target.destinationUrl, 307);
}
