import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { getEnvironmentConfig } from '../src/config/env.js';

// This one focused test must never fall back to the application's DATABASE_URL.
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error('TEST_DATABASE_URL is required for Prisma integration tests');
let target: URL;
try {
  target = new URL(databaseUrl);
} catch {
  throw new Error('Invalid TEST_DATABASE_URL');
}
if (
  !['postgres:', 'postgresql:'].includes(target.protocol) ||
  !['127.0.0.1', 'localhost'].includes(target.hostname) ||
  target.pathname !== '/ushly_t22_test' ||
  process.env.NODE_ENV === 'production'
) {
  throw new Error(
    'Prisma integration tests require the local ushly_t22_test database',
  );
}

const env = getEnvironmentConfig({
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  DATABASE_URL: databaseUrl,
  DATABASE_READY_TIMEOUT_MS: '1000',
  REDIS_URL: 'redis://127.0.0.1:1',
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
  COOKIE_NAME: 'session',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  COOKIE_MAX_AGE: '1000',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
});

test('plugin owns a shared working client, probes PostgreSQL, and disconnects on close', async (t) => {
  const app = await buildApp({ env });
  t.after(() => app.close());
  const disconnect = t.mock.method(app.prisma, '$disconnect');
  const query = t.mock.method(app.prisma, '$queryRaw');
  await app.register(async (child) => {
    assert.equal(child.prisma, app.prisma);
  });
  await app.ready();
  assert.equal(query.mock.callCount(), 1);
  assert.equal((await app.inject('/health/ready')).statusCode, 200);
  assert.equal(query.mock.callCount(), 2);

  const email = `prisma-${randomUUID()}@example.test`;
  try {
    const created = await app.prisma.user.create({ data: { email } });
    const loaded = await app.prisma.user.findUnique({
      where: { id: created.id },
    });
    assert.equal(loaded?.email, email);
  } finally {
    await app.prisma.user.deleteMany({ where: { email } });
  }
  await app.close();
  assert.equal(disconnect.mock.callCount(), 1);
  await assert.rejects(app.inject('/health/live'), /closed|closing|destroyed/i);
});
