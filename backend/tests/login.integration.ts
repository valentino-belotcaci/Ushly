import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { registerUser } from '../src/modules/auth/auth.service.js';
import {
  cleanTestDatabase,
  getTestEnvironment,
} from './helpers/test-database.js';

const password = 'a login integration passphrase';

test('login returns minimal short-lived token, safe user, and authenticates a protected route', async (t) => {
  const env = { ...getTestEnvironment(), accessTokenTtlSeconds: 120 };
  let logs = '';
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logs += chunk.toString();
      done();
    },
  });
  const app = await buildApp({ env, logger: { level: 'info', stream } });
  t.after(async () => {
    try {
      await cleanTestDatabase(app.prisma);
    } finally {
      await app.close();
    }
  });
  app.get(
    '/protected-test',
    { preHandler: app.authenticate },
    async (request) => request.authenticatedUser,
  );
  await app.ready();
  await cleanTestDatabase(app.prisma);
  const created = await registerUser(app.prisma, {
    email: 'alice@example.test',
    password,
  });
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: ' ALICE@EXAMPLE.TEST ', password },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'no-store');
  const body = response.json();
  assert.deepEqual(Object.keys(body).sort(), ['accessToken', 'user']);
  assert.deepEqual(body.user, created);
  const claims = app.jwt.verify<{ sub: string; iat: number; exp: number }>(
    body.accessToken,
  );
  assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'sub']);
  assert.equal(claims.sub, created.id);
  assert.equal(claims.exp - claims.iat, 120);
  const protectedResponse = await app.inject({
    url: '/protected-test',
    headers: { authorization: `Bearer ${body.accessToken}` },
  });
  assert.deepEqual(protectedResponse.json(), { id: created.id });
  const stored = await app.prisma.user.findUnique({
    where: { id: created.id },
  });
  assert.ok(stored?.passwordHash);
  for (const sensitive of [password, stored.passwordHash, env.jwtSecret])
    assert.ok(!response.body.includes(sensitive));
  for (const sensitive of [
    password,
    stored.passwordHash,
    env.jwtSecret,
    body.accessToken,
  ])
    assert.ok(!logs.includes(sensitive));
});

test('unknown email, wrong password and passwordless account have identical failures; every attempt is limited', async (t) => {
  const app = await buildApp({ env: getTestEnvironment() });
  t.after(async () => {
    try {
      await cleanTestDatabase(app.prisma);
    } finally {
      await app.close();
    }
  });
  await app.ready();
  await cleanTestDatabase(app.prisma);
  await registerUser(app.prisma, { email: 'known@example.test', password });
  await app.prisma.user.create({
    data: { email: 'oauth@example.test', provider: 'google' },
  });
  for (const email of [
    'unknown@example.test',
    'known@example.test',
    'oauth@example.test',
    'unknown@example.test',
    'known@example.test',
  ]) {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrong' },
    });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), {
      error: 'invalid_credentials',
      message: 'Invalid email or password',
      details: null,
    });
  }
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'known@example.test', password },
      })
    ).statusCode,
    429,
  );
});
