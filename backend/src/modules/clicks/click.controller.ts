import type { FastifyRequest } from 'fastify';

import { getLinkStatisticsService } from './click.service.statistics.js';
import type { StatisticsParams, StatisticsQuery } from './click.schemas.js';

export async function getLinkStatisticsController(
  request: FastifyRequest<{ Params: StatisticsParams; Querystring: StatisticsQuery }>,
) {
  if (!request.authenticatedUser) throw new Error('Authenticated user missing');
  return getLinkStatisticsService(
    request.server.prisma,
    request.authenticatedUser.id,
    request.params.id,
    request.query,
  );
}
