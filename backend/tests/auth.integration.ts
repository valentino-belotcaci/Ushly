import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { AppError } from '../src/errors/app-error.js';
import {
  createLocalUser,
  findUserByEmail,
} from '../src/modules/auth/auth.repository.js';
import { hashPassword, verifyPassword } from '../src/utils/password.js';
import {
  cleanTestDatabase,
  getTestEnvironment,
} from './helpers/test-database.js';

test('local users are persisted with hashes and found by normalized email; duplicates are rejected', async (t) => {
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
  const password = 'integration-only password with spaces';
  const passwordHash = await hashPassword(password);
  const created = await createLocalUser(app.prisma, {
    email: '  Alice.Example+test@Example.TEST  ',
    passwordHash,
  });
  assert.equal(created.email, 'alice.example+test@example.test');
  assert.equal(created.provider, 'local');
  assert.equal(created.providerId, null);
  const loaded = await findUserByEmail(
    app.prisma,
    ' ALICE.EXAMPLE+TEST@EXAMPLE.TEST ',
  );
  assert.equal(loaded?.id, created.id);
  assert.ok(loaded?.passwordHash);
  assert.equal(await verifyPassword(password, loaded.passwordHash), true);
  assert.ok(!JSON.stringify(loaded).includes(password));
  assert.ok(!JSON.stringify(created).includes(password));
  assert.equal(await findUserByEmail(app.prisma, 'missing@example.test'), null);

  await assert.rejects(
    createLocalUser(app.prisma, {
      email: 'ALICE.EXAMPLE+TEST@example.test',
      passwordHash,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'user_creation_failed');
      assert.equal(error.message, 'Unable to create user');
      assert.equal(error.details, null);
      assert.ok(!String(error).includes(created.email));
      return true;
    },
  );
  assert.equal(await app.prisma.user.count(), 1);
});

test('database uniqueness resolves concurrent normalized-email creation', async (t) => {
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
  const outcomes = await Promise.allSettled([
    createLocalUser(app.prisma, {
      email: 'race@example.test',
      passwordHash: await hashPassword('race-test password'),
    }),
    createLocalUser(app.prisma, {
      email: ' RACE@EXAMPLE.TEST ',
      passwordHash: await hashPassword('race-test password'),
    }),
  ]);
  assert.equal(
    outcomes.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(
    outcomes.filter((result) => result.status === 'rejected').length,
    1,
  );
  assert.equal(await app.prisma.user.count(), 1);
});
