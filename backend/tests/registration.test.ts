import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import type { Prisma } from '@prisma/client';

import { buildApp } from '../src/app.js';
import { registerUser } from '../src/modules/auth/auth.service.js';
import { verifyPassword } from '../src/utils/password.js';
import { getTestEnvironment } from './helpers/test-database.js';

const env = getTestEnvironment({
  NODE_ENV: 'test',
  TEST_DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/ushly_test',
});

test('registration service normalizes, hashes before persistence, and selects public fields', async (t) => {
  const app = await buildApp({ env });
  t.after(() => app.close());
  let persistedHash = '';
  // Prisma delegates are Proxies without ordinary method descriptors. Replace
  // the method via the Proxy setter and restore it after the isolated test.
  const originalCreate = app.prisma.user.create;
  t.after(() => {
    Reflect.set(app.prisma.user, 'create', originalCreate);
  });
  Reflect.set(
    app.prisma.user,
    'create',
    t.mock.fn(async (args: Prisma.UserCreateArgs) => {
      assert.equal(args.data.email, 'alice@example.test');
      assert.equal('password' in args.data, false);
      assert.equal(typeof args.data.passwordHash, 'string');
      if (typeof args.data.passwordHash !== 'string')
        throw new Error('Missing hash');
      persistedHash = args.data.passwordHash;
      return {
        id: 'user-id',
        email: args.data.email,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        passwordHash: persistedHash,
        providerId: 'private-marker',
      };
    }),
  );
  const password = 'a long service test password';
  const result = await registerUser(app.prisma, {
    email: ' ALICE@EXAMPLE.TEST ',
    password,
  });
  assert.deepEqual(result, {
    id: 'user-id',
    email: 'alice@example.test',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(await verifyPassword(password, persistedHash), true);
});

test('registration limit counts invalid attempts and leaves baseline routes available', async (t) => {
  const app = await buildApp({ env });
  t.after(() => app.close());
  t.mock.method(app.prisma, '$queryRaw', async () => []);
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/register',
          payload: { email: 'invalid', password: 'short' },
        })
      ).statusCode,
      400,
    );
  }
  const limited = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {},
  });
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers['x-ratelimit-limit'], '5');
  assert.ok(limited.headers['retry-after']);
  const live = await app.inject('/health/live');
  assert.equal(live.statusCode, 200);
  assert.equal(live.headers['x-ratelimit-limit'], '100');
});

test('registration failure and malformed JSON cannot expose passwords or driver details in logs/responses', async (t) => {
  let logs = '';
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logs += chunk.toString();
      done();
    },
  });
  const app = await buildApp({ env, logger: { level: 'info', stream } });
  t.after(() => app.close());
  t.mock.method(app.prisma, '$queryRaw', async () => []);
  const password = 'sensitive-password-marker';
  const originalCreate = app.prisma.user.create;
  t.after(() => {
    Reflect.set(app.prisma.user, 'create', originalCreate);
  });
  Reflect.set(
    app.prisma.user,
    'create',
    t.mock.fn(async () => {
      throw new Error(`${password} private-hash-marker prisma-private-detail`);
    }),
  );
  const failed = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'log@example.test', password },
  });
  assert.equal(failed.statusCode, 500);
  assert.deepEqual(failed.json(), {
    error: 'internal_server_error',
    message: 'An unexpected error occurred',
    details: null,
  });
  const malformed = await app.inject({
    method: 'POST',
    url: '/auth/register',
    headers: { 'content-type': 'application/json' },
    payload: `{"password":"${password}",bad}`,
  });
  assert.equal(malformed.statusCode, 400);
  assert.ok(logs.length > 0);
  assert.doesNotMatch(
    logs + failed.body + malformed.body,
    /sensitive-password-marker|private-hash-marker|prisma-private-detail/,
  );
});
