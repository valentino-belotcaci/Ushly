import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { findOwnedLink } from '../links/link.repository.js';
import { getOwnedClickStatistics } from './click.repository.js';
import type { StatisticsQuery } from './click.schemas.js';

//prevent that someone asks years of click data in one expensive query
const MAX_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;//90 days

//if user doesnt provide a range, use last 30 days
const DEFAULT_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function parseRange(query: StatisticsQuery): { from: Date; to: Date } {
  //if to date is not provided, use the date of today
  const to = query.to === undefined ? new Date() : new Date(query.to);
  //if no date from provided, use to date -30 days
  const from = query.from === undefined
    ? new Date(to.getTime() - DEFAULT_PERIOD_MS)
    : new Date(query.from);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    throw new AppError('invalid_statistics_range', 'Invalid statistics time range', 400);
  }
  if (to.getTime() - from.getTime() > MAX_PERIOD_MS) {
    throw new AppError('statistics_range_too_large', 'Statistics range cannot exceed 90 days', 422);
  }
  return { from, to };
}

export async function getLinkStatisticsService(
  prisma: PrismaClient,
  userId: string,
  linkId: string,
  query: StatisticsQuery,
) {
  const link = await findOwnedLink(prisma, userId, linkId);
  if (!link) throw new AppError('link_not_found', 'Link not found', 404);

  const { from, to } = parseRange(query);
  const granularity = query.granularity ?? 'day';
  const statistics = await getOwnedClickStatistics(prisma, userId, linkId, from, to, granularity);

  return {
    linkId,
    from: from.toISOString(),
    to: to.toISOString(),
    timezone: 'UTC',
    granularity,
    total: statistics.total,
    firstClickedAt: statistics.firstClickedAt?.toISOString() ?? null,
    lastClickedAt: statistics.lastClickedAt?.toISOString() ?? null,
    timeSeries: statistics.timeSeries.map((entry) => ({ bucket: entry.bucket.toISOString(), clicks: entry.clicks })),
    breakdowns: {
      referrers: statistics.referrers,
      userAgents: statistics.userAgents,
    },
  };
}
