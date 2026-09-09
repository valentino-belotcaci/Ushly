import assert from 'node:assert/strict';
import test from 'node:test';

import { getEnvironmentConfig } from '../src/config/env.js';

const validEnv = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/ushly',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'this-is-a-valid-jwt-secret-32-bytes!!',
  COOKIE_NAME: 'ushly_session',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  COOKIE_MAX_AGE: '86400000',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
  TRUST_PROXY: '',
};

test('getEnvironmentConfig accepts valid configuration values', () => {
  const env = getEnvironmentConfig(validEnv);

  assert.equal(env.nodeEnv, 'test');
  assert.equal(env.host, '127.0.0.1');
  assert.equal(env.port, 3000);
  assert.equal(env.databaseUrl, 'postgresql://postgres:postgres@localhost:5432/ushly');
  assert.equal(env.redisUrl, 'redis://localhost:6379');
  assert.equal(env.jwtSecret, 'this-is-a-valid-jwt-secret-32-bytes!!');
  assert.deepEqual(env.corsAllowedOrigins, ['http://localhost:5173', 'http://127.0.0.1:5173']);
  assert.equal(env.trustProxy, false);
});

test('getEnvironmentConfig rejects short JWT secrets', () => {
  assert.throws(
    () =>
      getEnvironmentConfig({
        ...validEnv,
        JWT_SECRET: 'short',
      }),
    /at least 32 characters/
  );
});

test('getEnvironmentConfig rejects insecure cookies in production', () => {
  assert.throws(
    () =>
      getEnvironmentConfig({
        ...validEnv,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
      }),
    /production requires secure cookies/
  );
});

test('getEnvironmentConfig parses trust-proxy values as strings or arrays', () => {
  const env = getEnvironmentConfig({
    ...validEnv,
    TRUST_PROXY: '127.0.0.1,10.0.0.0/8',
  });

  assert.deepEqual(env.trustProxy, ['127.0.0.1', '10.0.0.0/8']);
});
