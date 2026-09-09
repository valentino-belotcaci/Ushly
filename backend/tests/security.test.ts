import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';

const buildSecurityApp = async () =>
  buildApp({
    env: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 3000,
      databaseUrl: 'postgresql://postgres:postgres@localhost:5432/ushly',
      redisUrl: 'redis://localhost:6379',
      jwtSecret: 'this-is-a-valid-jwt-secret-32b',
      cookie: {
        name: 'ushly_session',
        secure: false,
        sameSite: 'lax',
        maxAgeMs: 86400000,
      },
      corsAllowedOrigins: ['http://localhost:5173'],
      trustProxy: false,
    },
  });

void test('allowed origins receive expected CORS headers', async () => {
  const app = await buildSecurityApp();

  const response = await app.inject({
    method: 'OPTIONS',
    url: '/health/live',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'GET',
    },
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.equal(response.headers['access-control-allow-credentials'], 'true');

  await app.close();
});

void test('rejected origins are not allowed by CORS', async () => {
  const app = await buildSecurityApp();

  const response = await app.inject({
    method: 'GET',
    url: '/health/live',
    headers: {
      Origin: 'https://evil.example',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.equal(response.headers['access-control-allow-credentials'], undefined);

  await app.close();
});

void test('security headers are present on responses', async () => {
  const app = await buildSecurityApp();

  const response = await app.inject({
    method: 'GET',
    url: '/health/live',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['x-dns-prefetch-control'], 'off');
  assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(response.headers['x-download-options'], 'noopen');

  await app.close();
});

void test('repeated requests trigger rate limiting', async () => {
  const app = await buildSecurityApp();

  for (let index = 0; index < 101; index += 1) {
    await app.inject({
      method: 'GET',
      url: '/health/live',
    });
  }

  const response = await app.inject({
    method: 'GET',
    url: '/health/live',
  });

  assert.equal(response.statusCode, 429);
  assert.equal(response.headers['x-ratelimit-limit'], '100');

  await app.close();
});
