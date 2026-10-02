import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { getTestEnvironment } from './helpers/test-database.js';
import { createTestRateLimitStore } from './helpers/rate-limit-store.js';

const env = getTestEnvironment({
  NODE_ENV: 'test',
  TEST_DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/ushly_test',
});

test('authenticate accepts valid identity and rejects missing, expired, malformed, tampered and invalid claims safely', async (t) => {
  let logs = '';
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logs += chunk.toString();
      done();
    },
  });
  const app = await buildApp({
    env,
    logger: { level: 'info', stream },
    rateLimitConfig: { store: createTestRateLimitStore() },
  });
  t.after(() => app.close());
  t.mock.method(app.prisma, '$queryRaw', async () => []);
  let disabledAt: Date | null = null;
  const originalFindUser = app.prisma.user.findUnique;
  t.after(() => {
    Reflect.set(app.prisma.user, 'findUnique', originalFindUser);
  });
  Reflect.set(
    app.prisma.user,
    'findUnique',
    t.mock.fn(async () => ({ disabledAt })),
  );
  app.get(
    '/protected-test',
    { preHandler: app.authenticate },
    async (request) => request.authenticatedUser,
  );
  const token = app.jwt.sign({ sub: 'user-test-id' });
  const good = await app.inject({
    url: '/protected-test',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(good.statusCode, 200);
  assert.deepEqual(good.json(), { id: 'user-test-id' });
  disabledAt = new Date();
  const disabled = await app.inject({
    url: '/protected-test',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(disabled.statusCode, 401);
  const expired = app.jwt.sign({ sub: 'user-test-id' }, { expiresIn: -1 });
  const parts = token.split('.');
  const tampered = `${parts[0]}.${Buffer.from(JSON.stringify({ sub: 'attacker' })).toString('base64url')}.${parts[2]}`;
  for (const value of [
    '',
    'not-a-jwt',
    expired,
    tampered,
    app.jwt.sign({ sub: '' }),
    app.jwt.sign({ sub: 'x' }, { algorithm: 'HS384' }),
  ]) {
    const response = await app.inject({
      url: '/protected-test',
      headers: value ? { authorization: `Bearer ${value}` } : {},
    });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), {
      error: 'unauthorized',
      message: 'Authentication required',
      details: null,
    });
  }
  // Overrides such as a capture stream must not disable mandatory redaction.
  app.log.info({
    authorization: `Bearer ${token}`,
    accessToken: token,
    password: 'private-password',
    passwordHash: 'private-hash',
    jwtSecret: env.jwtSecret,
  });
  for (const sensitive of [
    token,
    expired,
    tampered,
    env.jwtSecret,
    'private-password',
    'private-hash',
  ]) {
    assert.ok(!logs.includes(sensitive));
  }
  assert.match(logs, /"authorization":"\[Redacted\]"/);
});

test('login rate limit counts invalid bodies before database work and preserves baseline', async (t) => {
  const app = await buildApp({
    env,
    rateLimitConfig: { store: createTestRateLimitStore() },
  });
  t.after(() => app.close());
  t.mock.method(app.prisma, '$queryRaw', async () => []);
  for (let i = 0; i < 5; i++) {
    assert.equal(
      (await app.inject({ method: 'POST', url: '/auth/login', payload: {} }))
        .statusCode,
      400,
    );
  }
  const limited = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {},
  });
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers['x-ratelimit-limit'], '5');
  assert.ok(limited.headers['retry-after']);
  assert.equal((await app.inject('/health/live')).statusCode, 200);
});
