import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

import { AppError, buildApp } from '../src/app.js';

const buildTestApp = async () => {
  const app = await buildApp({
    env: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 3000,
      databaseUrl: 'postgresql://unused:unused@127.0.0.1:1/ushly_test',
      databaseReadyTimeoutMs: 1000,
      redisUrl: 'redis://localhost:6379',
      jwtSecret: 'this-is-a-valid-jwt-secret-32b',
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

test('buildApp exposes a health endpoint with service metadata', async () => {
  const app = await buildTestApp();

  const response = await app.inject({
    method: 'GET',
    url: '/health/live',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    service: 'ushly-backend',
    environment: 'test',
  });

  await app.close();
});

test('buildApp returns safe validation errors for invalid request payloads', async () => {
  const app = await buildTestApp();

  app.post('/demo', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async () => ({ ok: true }));

  const response = await app.inject({
    method: 'POST',
    url: '/demo',
    payload: { email: 'not-an-email' },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'validation_error');
  assert.equal(response.json().message, 'Request validation failed');

  await app.close();
});

test('AppError is returned as a safe public error response', async () => {
  const app = await buildTestApp();

  app.get('/demo-error', async () => {
    throw new AppError('invalid_link', 'The provided link is invalid', 422, { field: 'url' });
  });

  const response = await app.inject({
    method: 'GET',
    url: '/demo-error',
  });

  assert.equal(response.statusCode, 422);
  assert.deepEqual(response.json(), {
    error: 'invalid_link',
    message: 'The provided link is invalid',
    details: { field: 'url' },
  });

  await app.close();
});

test('unexpected errors are hidden behind a generic 500 response', async () => {
  const app = await buildTestApp();

  app.get('/crash', async () => {
    throw new Error('surprising internal failure');
  });

  const response = await app.inject({
    method: 'GET',
    url: '/crash',
  });

  assert.equal(response.statusCode, 500);
  assert.equal(response.json().error, 'internal_server_error');
  assert.equal(response.json().message, 'An unexpected error occurred');
  assert.equal(response.json().details, null);

  await app.close();
});
