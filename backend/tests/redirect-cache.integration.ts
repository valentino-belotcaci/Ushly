import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

import { buildApp } from '../src/app.js';
import {
  getRedirectCacheMetrics,
  invalidateRedirectCache,
  redirectCacheKey,
  resetRedirectCacheMetrics,
} from '../src/modules/redirects/redirect.cache.js';
import { cleanTestDatabase, getTestEnvironment } from './helpers/test-database.js';

async function createApp(t: TestContext) {
  const app = await buildApp({ env: getTestEnvironment() });
  t.after(async () => {
    try {
      await cleanTestDatabase(app.prisma);
    } finally {
      await app.close();
    }
  });
  await app.ready();
  await cleanTestDatabase(app.prisma);
  return app;
}

function useFakeRedis(
  app: Awaited<ReturnType<typeof buildApp>>,
  t: TestContext,
  initial = new Map<string, string>(),
) {
  const values = initial;
  Object.defineProperty(app.redis, 'isReady', {
    configurable: true,
    get: () => true,
  });
  t.mock.method(app.redis, 'get', async (key: string) => values.get(key) ?? null);
  t.mock.method(app.redis, 'set', async (key: string, value: string) => {
    values.set(key, value);
    return 'OK';
  });
  t.mock.method(app.redis, 'del', async (key: string) => {
    values.delete(key);
    return 1;
  });
  return values;
}

async function createActiveLink(
  app: Awaited<ReturnType<typeof buildApp>>,
  shortCode: string,
  values: { status?: 'active' | 'disabled'; expiresAt?: Date | null } = {},
) {
  return app.prisma.link.create({
    data: {
      shortCode,
      destinationUrl: `https://example.com/${shortCode}`,
      status: values.status ?? 'active',
      expiresAt: values.expiresAt ?? null,
    },
  });
}

test('redirect cache handles miss, database fallback, and hit', async (t) => {
  const app = await createApp(t);
  useFakeRedis(app, t);
  resetRedirectCacheMetrics();
  await createActiveLink(app, 'cache01');

  const first = await app.inject('/cache01');
  const second = await app.inject('/cache01');

  assert.equal(first.statusCode, 307);
  assert.equal(second.statusCode, 307);
  assert.equal(await app.prisma.click.count({ where: { linkId: (await app.prisma.link.findUniqueOrThrow({ where: { shortCode: 'cache01' } })).id } }), 2);
  assert.deepEqual(getRedirectCacheMetrics(), { cacheHits: 1, cacheMisses: 1 });
});

test('corrupt and unusable cached values fall back to PostgreSQL', async (t) => {
  const app = await createApp(t);
  const values = useFakeRedis(app, t);
  await createActiveLink(app, 'corrupt1');
  values.set(redirectCacheKey('corrupt1'), '{not-json');

  const corrupt = await app.inject('/corrupt1');
  assert.equal(corrupt.statusCode, 307);
  assert.match(corrupt.headers.location ?? '', /corrupt1/);

  values.set(
    redirectCacheKey('corrupt1'),
    JSON.stringify({
      version: 1,
      destinationUrl: 'https://example.com/stale',
      status: 'disabled',
      expiresAt: null,
    }),
  );
  const unusable = await app.inject('/corrupt1');
  assert.equal(unusable.statusCode, 307);
  assert.match(unusable.headers.location ?? '', /corrupt1/);
});

test('expired and disabled cached values never redirect', async (t) => {
  const app = await createApp(t);
  const values = useFakeRedis(app, t);
  for (const shortCode of ['cachedDisabled', 'cachedExpired']) {
    values.set(
      redirectCacheKey(shortCode),
      JSON.stringify({
        version: 1,
        destinationUrl: 'https://example.com/unsafe-stale',
        status: shortCode === 'cached-disabled' ? 'disabled' : 'active',
        expiresAt: shortCode === 'cached-expired'
          ? new Date(Date.now() - 1_000).toISOString()
          : null,
      }),
    );
  }

  await createActiveLink(app, 'cachedDisabled', { status: 'disabled' });
  await createActiveLink(app, 'cachedExpired', {
    expiresAt: new Date(Date.now() - 1_000),
  });
  assert.equal((await app.inject('/cachedDisabled')).statusCode, 404);
  assert.equal((await app.inject('/cachedExpired')).statusCode, 404);
});

test('cache invalidation removes the affected versioned key', async (t) => {
  const app = await createApp(t);
  const values = useFakeRedis(app, t);
  values.set(redirectCacheKey('invalidate'), 'value');

  await invalidateRedirectCache(app.redis, 'invalidate');

  assert.equal(values.has(redirectCacheKey('invalidate')), false);
});

test('Redis unavailability falls back to the database redirect', async (t) => {
  const app = await createApp(t);
  await createActiveLink(app, 'redisDown');

  const response = await app.inject('/redisDown');

  assert.equal(response.statusCode, 307);
  assert.match(response.headers.location ?? '', /redisDown/);
});
