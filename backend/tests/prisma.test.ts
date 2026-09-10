import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { getEnvironmentConfig } from '../src/config/env.js';

const env = getEnvironmentConfig({
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/ushly_test',
  DATABASE_READY_TIMEOUT_MS: '25',
  REDIS_URL: 'redis://127.0.0.1:1',
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
  COOKIE_NAME: 'session',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  COOKIE_MAX_AGE: '1000',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
});
const unavailable = {
  error: 'service_unavailable',
  message: 'Database is unavailable',
  details: null,
};

test('startup failure preserves liveness; probe errors are safe in responses and logs; DB can recover', async (t) => {
  let logs = '';
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logs += chunk.toString();
      done();
    },
  });
  const app = await buildApp({ env, logger: { level: 'warn', stream } });
  t.after(() => app.close());
  const query = t.mock.method(
    app.prisma,
    '$queryRaw',
    async (): Promise<unknown> => {
      throw new Error('private-database-credential internal-stack-marker');
    },
  );
  await app.ready();
  assert.equal(query.mock.callCount(), 1);
  assert.equal((await app.inject('/health/live')).statusCode, 200);
  assert.equal(query.mock.callCount(), 1);
  const response = await app.inject('/health/ready');
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), unavailable);
  assert.doesNotMatch(
    logs + response.body,
    /private-database-credential|internal-stack-marker/,
  );
  assert.match(logs, /Database unavailable during application readiness/);
  query.mock.mockImplementation(async () => [{ value: 1 }]);
  assert.equal((await app.inject('/health/ready')).statusCode, 200);
});

test('timeout bounds responses, shares pending queries, and handles late rejection', async (t) => {
  const app = await buildApp({ env });
  t.after(() => app.close());
  let rejectQuery: (error: Error) => void = () => {
    throw new Error('Query did not start');
  };
  const query = t.mock.method(
    app.prisma,
    '$queryRaw',
    () =>
      new Promise((_resolve, reject) => {
        rejectQuery = reject;
      }),
  );
  await app.ready();
  const started = performance.now();
  const responses = await Promise.all([
    app.inject('/health/ready'),
    app.inject('/health/ready'),
  ]);
  assert.ok(performance.now() - started < 1000);
  for (const response of responses) {
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), unavailable);
  }
  assert.equal(query.mock.callCount(), 1);
  assert.equal((await app.inject('/health/live')).statusCode, 200);
  rejectQuery(new Error('late private database error'));
  await new Promise((resolve) => setImmediate(resolve));
  query.mock.mockImplementation(async () => [{ value: 1 }]);
  assert.equal((await app.inject('/health/ready')).statusCode, 200);
});
