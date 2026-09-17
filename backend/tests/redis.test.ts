import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { getEnvironmentConfig } from '../src/config/env.js';
import { getRedisReconnectDelay } from '../src/plugins/redis.plugin.js';

const env = getEnvironmentConfig({
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/ushly_test',
  DATABASE_READY_TIMEOUT_MS: '25',
  REDIS_URL: 'redis://127.0.0.1:1',
  REDIS_CONNECT_TIMEOUT_MS: '25',
  REDIS_MAX_RECONNECT_ATTEMPTS: '0',
  REDIS_RECONNECT_BASE_DELAY_MS: '1',
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
  IP_HASH_SECRET: 'test-only-ip-hash-secret-with-at-least-32-characters',
  COOKIE_NAME: 'session',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  COOKIE_MAX_AGE: '1000',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
});

test('Redis failure keeps liveness available and makes readiness unavailable', async (t) => {
  const app = await buildApp({ env, logger: false });
  t.after(() => app.close());
  const query = t.mock.method(app.prisma, '$queryRaw', async () => [{ value: 1 }]);

  await app.ready();
  query.mock.resetCalls();
  assert.equal(typeof app.redis.close, 'function');
  assert.equal(app.redis.isReady, false);
  assert.equal((await app.inject('/health/live')).statusCode, 200);
  const readiness = await app.inject('/health/ready');
  assert.equal(readiness.statusCode, 503);
  assert.deepEqual(readiness.json(), {
    error: 'service_unavailable',
    message: 'Redis is unavailable',
    details: null,
  });
  assert.equal(query.mock.callCount(), 1);
});

test('Redis reconnection strategy stops at the configured limit', () => {
  assert.equal(getRedisReconnectDelay(0, 3, 100), 100);
  assert.equal(getRedisReconnectDelay(2, 3, 100), 400);
  assert.equal(getRedisReconnectDelay(3, 3, 100), false);
});

test('Redis configuration validates timeout and bounded reconnect settings', () => {
  const input = {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '3000',
    DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/ushly_test',
    REDIS_URL: 'redis://127.0.0.1:1',
    JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
    IP_HASH_SECRET: 'test-only-ip-hash-secret-with-at-least-32-characters',
    COOKIE_NAME: 'session',
    COOKIE_SECURE: 'false',
    COOKIE_SAME_SITE: 'lax',
    COOKIE_MAX_AGE: '1000',
    CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
  };
  assert.throws(
    () => getEnvironmentConfig({ ...input, REDIS_CONNECT_TIMEOUT_MS: '0' }),
    /Invalid REDIS_CONNECT_TIMEOUT_MS/,
  );
  assert.throws(
    () => getEnvironmentConfig({ ...input, REDIS_MAX_RECONNECT_ATTEMPTS: '11' }),
    /Invalid REDIS_MAX_RECONNECT_ATTEMPTS/,
  );
});
