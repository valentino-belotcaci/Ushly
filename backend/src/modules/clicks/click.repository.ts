import { Prisma, type PrismaClient } from '@prisma/client';

type CreateClickInput = {
  linkId: string;
  ipHash: string;
  referrer: string | null; //used to know where the user came from, if they clicked a link on another website
  userAgent: string | null; //used to show statistics about the user's device, browser, and operating system
};

export async function createClick(
  prisma: PrismaClient,
  input: CreateClickInput,
): Promise<void> {
  await prisma.click.create({
    data: {
      linkId: input.linkId,
      ipHash: input.ipHash,
      referrer: input.referrer,
      userAgent: input.userAgent,
      countryCode: null,
    },
  });
}

export type ClickStatistics = {
  total: number;
  firstClickedAt: Date | null;
  lastClickedAt: Date | null;
  timeSeries: Array<{ bucket: Date; clicks: number }>;
  referrers: Array<{ value: string; clicks: number }>;
  userAgents: Array<{ value: string; clicks: number }>;
};

const bucketExpressions = {
  hour: 'hour',
  day: 'day',
  week: 'week',
} as const;

export async function getOwnedClickStatistics(
  prisma: PrismaClient,
  userId: string,
  linkId: string,
  from: Date,
  to: Date,
  granularity: keyof typeof bucketExpressions,
): Promise<ClickStatistics> {
  const bucket = bucketExpressions[granularity];
  const [summary, timeSeries, referrers, userAgents] = await Promise.all([
    prisma.click.aggregate({
      where: { link: { id: linkId, userId }, clickedAt: { gte: from, lt: to } },//clicked at must be >= from and < to
      _count: { _all: true },
      _min: { clickedAt: true },
      _max: { clickedAt: true },
    }),
    prisma.$queryRaw<Array<{ bucket: Date; clicks: bigint }>>(Prisma.sql`
      SELECT date_trunc(${bucket}, "clickedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket,
             COUNT(*)::bigint AS clicks
      FROM "Click"
      WHERE "linkId" = ${linkId}
        AND "clickedAt" >= ${from}
        AND "clickedAt" < ${to}
        AND EXISTS (
          SELECT 1 FROM "Link" WHERE "Link"."id" = "Click"."linkId" AND "Link"."userId" = ${userId}
        )
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    prisma.click.groupBy({
      by: ['referrer'],
      where: { link: { id: linkId, userId }, clickedAt: { gte: from, lt: to }, referrer: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { referrer: 'desc' } },
      take: 10,
    }),
    prisma.click.groupBy({
      by: ['userAgent'],
      where: { link: { id: linkId, userId }, clickedAt: { gte: from, lt: to }, userAgent: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { userAgent: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    total: summary._count._all,
    firstClickedAt: summary._min.clickedAt,
    lastClickedAt: summary._max.clickedAt,
    timeSeries: timeSeries.map((entry) => ({ bucket: entry.bucket, clicks: Number(entry.clicks) })),
    referrers: referrers.flatMap((entry) => entry.referrer === null ? [] : [{ value: entry.referrer, clicks: entry._count._all }]),
    userAgents: userAgents.flatMap((entry) => entry.userAgent === null ? [] : [{ value: entry.userAgent, clicks: entry._count._all }]),
  };
}
