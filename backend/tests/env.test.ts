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
  IP_HASH_SECRET: 'this-is-a-separate-ip-hash-secret-32-bytes!!',
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

test('database readiness timeout defaults to 1000ms and accepts a configured deadline', () => {
  assert.equal(getEnvironmentConfig(validEnv).databaseReadyTimeoutMs, 1000);
  assert.equal(getEnvironmentConfig({ ...validEnv, DATABASE_READY_TIMEOUT_MS: '250' }).databaseReadyTimeoutMs, 250);
});

test('database readiness timeout rejects invalid and excessive values without echoing input', () => {
  for (const value of ['', '0', '-1', '1.5', '5001', '250ms', 'private-value']) {
    assert.throws(() => getEnvironmentConfig({ ...validEnv, DATABASE_READY_TIMEOUT_MS: value }), {
      message: 'Invalid DATABASE_READY_TIMEOUT_MS: expected an integer between 1 and 5000.',
    });
  }
});

test('access token expiration defaults to fifteen minutes and validates configured seconds', () => {
  assert.equal(getEnvironmentConfig(validEnv).accessTokenTtlSeconds, 900);
  assert.equal(getEnvironmentConfig({ ...validEnv, ACCESS_TOKEN_TTL_SECONDS: '120' }).accessTokenTtlSeconds, 120);
  for (const value of ['', '0', '-1', '59', '3601', '1.5', '15m']) {
    assert.throws(() => getEnvironmentConfig({ ...validEnv, ACCESS_TOKEN_TTL_SECONDS: value }), /Invalid ACCESS_TOKEN_TTL_SECONDS/);
  }
});

test('Google configuration is opt-in, complete, exact, bounded and HTTPS in production', () => {
  assert.equal(getEnvironmentConfig(validEnv).google, undefined);
  const google = {
    GOOGLE_CLIENT_ID: 'test-client',
    GOOGLE_CLIENT_SECRET: 'placeholder-secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://127.0.0.1:4173/auth/google/callback',
  };
  assert.equal(
    getEnvironmentConfig({ ...validEnv, ...google }).google?.stateTtlSeconds,
    300,
  );
  assert.throws(() =>
    getEnvironmentConfig({ ...validEnv, GOOGLE_CLIENT_ID: 'test-client' }),
  );
  for (const uri of [
    'https://evil.test/auth/google/callback?next=x',
    'https://host.test/auth/google/callback#fragment',
    'https://user:secret@host.test/auth/google/callback',
    'https://host.test/auth/google/callback/',
    'http://remote.test/auth/google/callback',
    'https://HOST.test/auth/google/callback',
    'https://host.test:443/auth/google/callback',
  ]) {
    assert.throws(
      () =>
        getEnvironmentConfig({
          ...validEnv,
          ...google,
          GOOGLE_OAUTH_REDIRECT_URI: uri,
        }),
      /Invalid GOOGLE_OAUTH_REDIRECT_URI/,
    );
  }
  assert.throws(() =>
    getEnvironmentConfig({
      ...validEnv,
      ...google,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'true',
    }),
  );
  assert.equal(
    getEnvironmentConfig({
      ...validEnv,
      ...google,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'true',
      GOOGLE_OAUTH_REDIRECT_URI: 'https://app.example.com/auth/google/callback',
    }).google?.redirectUri,
    'https://app.example.com/auth/google/callback',
  );
  for (const ttl of ['0', '301', 'NaN'])
    assert.throws(() =>
      getEnvironmentConfig({
        ...validEnv,
        ...google,
        GOOGLE_OAUTH_STATE_TTL_SECONDS: ttl,
      }),
    );
});
