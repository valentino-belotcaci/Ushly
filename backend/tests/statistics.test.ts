import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';

import { getLinkStatisticsService } from '../src/modules/clicks/click.service.statistics.js';

function fakePrisma(link: object | null, empty = false): PrismaClient {
  return {
    link: {
      findFirst: async () => link,
    },
    click: {
      aggregate: async () => ({
        _count: { _all: empty ? 0 : 3 },
        _min: { clickedAt: empty ? null : new Date('2026-01-02T00:00:00.000Z') },
        _max: { clickedAt: empty ? null : new Date('2026-01-03T00:00:00.000Z') },
      }),
      groupBy: async (args: { by: string[] }) => empty ? [] : args.by[0] === 'referrer'
        ? [{ referrer: 'https://example.com', _count: { _all: 2 } }]
        : [{ userAgent: 'browser', _count: { _all: 1 } }],
    },
    $queryRaw: async () => empty ? [] : [{ bucket: new Date('2026-01-02T00:00:00.000Z'), clicks: 3n }],
  } as unknown as PrismaClient;
}

test('statistics enforce ownership and return empty aggregates safely', async () => {
  await assert.rejects(
    getLinkStatisticsService(
      fakePrisma(null),
      'owner-a',
      'foreign-link',
      { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
    ),
    { code: 'link_not_found', statusCode: 404 },
  );
});

test('statistics validate bounded ranges and preserve UTC granularity', async () => {
  const prisma = fakePrisma({ id: 'link-1' });
  await assert.rejects(
    getLinkStatisticsService(prisma, 'owner-a', 'link-1', {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-04-02T00:00:00.000Z',
    }),
    { code: 'statistics_range_too_large', statusCode: 422 },
  );

  const result = await getLinkStatisticsService(prisma, 'owner-a', 'link-1', {
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-01-03T00:00:00.000Z',
    granularity: 'hour',
  });

  assert.equal(result.timezone, 'UTC');
  assert.equal(result.granularity, 'hour');
  assert.equal(result.total, 3);
  assert.deepEqual(result.timeSeries[0], { bucket: '2026-01-02T00:00:00.000Z', clicks: 3 });
  assert.deepEqual(result.breakdowns.referrers, [{ value: 'https://example.com', clicks: 2 }]);
});

test('statistics return empty results without inventing buckets', async () => {
  const result = await getLinkStatisticsService(
    fakePrisma({ id: 'link-1' }, true),
    'owner-a',
    'link-1',
    { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.total, 0);
  assert.equal(result.firstClickedAt, null);
  assert.deepEqual(result.timeSeries, []);
});
