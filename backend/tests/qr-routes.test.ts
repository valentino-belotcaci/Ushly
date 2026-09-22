import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

import { buildApp } from '../src/app.js';

const buildQrTestApp = async () => {
  const app = await buildApp({
    env: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 3000,
      databaseUrl: 'postgresql://unused:unused@127.0.0.1:1/ushly_test',
      databaseReadyTimeoutMs: 1000,
      redisUrl: 'redis://127.0.0.1:1',
      redisConnectTimeoutMs: 25,
      redisMaxReconnectAttempts: 0,
      redisReconnectBaseDelayMs: 1,
      loadTestMode: false,
      loadTestRateLimitMax: 100000,
      jwtSecret: 'this-is-a-valid-jwt-secret-32b',
      ipHashSecret: 'this-is-a-separate-ip-hash-secret-32b',
      clickRetentionDays: 90,
      accessTokenTtlSeconds: 900,
      cookie: {
        name: 'ushly_session',
        secure: false,
        sameSite: 'lax',
        maxAgeMs: 86400000,
      },
      corsAllowedOrigins: ['http://localhost:5173'],
      trustProxy: false,
    },
    logger: false,
  });
  mock.method(app.prisma, '$queryRaw', async () => [{ value: 1 }]);
  return app;
};

test('protected QR route preserves authentication and ownership for every public-link category', async (t) => {
  const app = await buildQrTestApp();
  t.after(() => app.close());
  let lookups = 0;
  // Keep real route/JWT guards; replace only persistent lookup with a deterministic boundary fake.
  Object.defineProperty(app, 'prisma', {
    value: {
      link: {
        findFirst: async (query: unknown) => {
          lookups += 1;
          assert.ok(query && typeof query === 'object' && 'where' in query);
          const where = query.where;
          assert.ok(
            where &&
              typeof where === 'object' &&
              'id' in where &&
              'userId' in where,
          );
          assert.equal(where.userId, 'owner-a');
          return where.id === 'owned-link' ? { shortCode: 'Ab12' } : null;
        },
      },
    },
  });
  for (const headers of [{}, { authorization: 'Bearer invalid-test-token' }]) {
    const response = await app.inject({
      method: 'GET',
      url: '/links/owned-link/qr',
      headers,
    });
    assert.equal(response.statusCode, 401);
  }
  assert.equal(
    lookups,
    0,
    'Unauthenticated requests must not reach link lookup',
  );
  const token = app.jwt.sign({ sub: 'owner-a' });
  for (const id of ['foreign-link', 'anonymous-link', 'missing-link']) {
    const response = await app.inject({
      method: 'GET',
      url: `/links/${id}/qr`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error, 'link_not_found');
  }
  const owned = await app.inject({
    method: 'GET',
    url: '/links/owned-link/qr',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(owned.statusCode, 200);
  assert.match(String(owned.headers['content-type']), /^image\/svg\+xml/);
  assert.ok(Buffer.byteLength(owned.body) <= 64 * 1024);
  assert.ok(!owned.body.includes(token));
});
