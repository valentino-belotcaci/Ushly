import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { verifyPassword } from '../src/utils/password.js';
import {
  cleanTestDatabase,
  getTestEnvironment,
} from './helpers/test-database.js';

const password = 'a long registration passphrase';

test('registration returns only public fields, persists a hash, and rejects duplicate normalized emails', async (t) => {
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
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: ' ALICE@EXAMPLE.TEST ', password },
  });
  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.deepEqual(Object.keys(body).sort(), ['createdAt', 'email', 'id']);
  assert.equal(body.email, 'alice@example.test');
  assert.ok(Number.isFinite(Date.parse(body.createdAt)));
  const user = await app.prisma.user.findUnique({
    where: { email: body.email },
  });
  assert.equal(user?.id, body.id);
  assert.ok(user?.passwordHash);
  assert.equal(await verifyPassword(password, user.passwordHash), true);
  assert.ok(!response.body.includes(password));
  const duplicate = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'Alice@example.test', password },
  });
  assert.equal(duplicate.statusCode, 409);
  assert.deepEqual(duplicate.json(), {
    error: 'user_creation_failed',
    message: 'Unable to create user',
    details: null,
  });
  assert.equal(await app.prisma.user.count(), 1);
});

test('registration rejects invalid fields, types, extra properties and oversized bodies before writing', async (t) => {
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
  const cases = [
    { email: 'bad-email', password },
    { email: 'valid@example.test', password: 'short' },
    { email: 'valid@example.test', password: 'a'.repeat(129) },
    { email: 'valid@example.test', password: 123456789012345 },
    { email: ['valid@example.test'], password },
    { email: 'valid@example.test' },
    { email: 'valid@example.test', password, role: 'admin' },
  ];
  for (const [index, payload] of cases.entries()) {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      remoteAddress: `127.0.0.${index + 2}`,
      payload,
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, 'validation_error');
  }
  const oversized = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'valid@example.test', password: 'x'.repeat(5000) },
  });
  assert.equal(oversized.statusCode, 413);
  assert.equal(await app.prisma.user.count(), 0);
});

test('concurrent registrations produce one success and one safe conflict', async (t) => {
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
  const responses = await Promise.all(
    ['race@example.test', 'RACE@EXAMPLE.TEST'].map((email) =>
      app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email, password },
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [201, 409]);
  assert.equal(await app.prisma.user.count(), 1);
  for (const response of responses)
    assert.doesNotMatch(response.body, /password|providerId|Prisma|tokenHash/);
});
