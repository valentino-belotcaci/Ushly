import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { createLocalUser } from '../src/modules/auth/auth.repository.js';
import { hashPassword } from '../src/utils/password.js';
import {
  cleanTestDatabase,
  getTestEnvironment,
} from './helpers/test-database.js';

test('requireAdmin returns 401, 403, and 200 for the appropriate callers', async (t) => {
  const app = await buildApp({ env: getTestEnvironment() });
  t.after(async () => {
    await cleanTestDatabase(app.prisma);
    await app.close();
  });

  app.get('/test-admin-only', {
    preHandler: [app.authenticate, app.requireAdmin],
  }, async () => ({ ok: true }));

  await app.ready();
  await cleanTestDatabase(app.prisma);

  const unauthenticated = await app.inject({ method: 'GET', url: '/test-admin-only' });
  assert.equal(unauthenticated.statusCode, 401);

  const selfPromotion = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      email: 'self-promoter@example.test',
      password: 'admin test password',
      role: 'ADMIN',
    },
  });
  assert.equal(selfPromotion.statusCode, 400);

  const passwordHash = await hashPassword('admin test password');
  const normalUser = await createLocalUser(app.prisma, { email: 'normal-admin-test@example.test', passwordHash });
  const adminUser = await createLocalUser(app.prisma, { email: 'admin-admin-test@example.test', passwordHash });
  await app.prisma.user.update({ where: { id: adminUser.id }, data: { role: 'ADMIN' } });

  const normalToken = await app.jwt.sign({ sub: normalUser.id });
  const adminToken = await app.jwt.sign({ sub: adminUser.id });
  const forbidden = await app.inject({
    method: 'GET',
    url: '/test-admin-only',
    headers: { authorization: `Bearer ${normalToken}` },
  });
  assert.equal(forbidden.statusCode, 403);

  const allowed = await app.inject({
    method: 'GET',
    url: '/test-admin-only',
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert.equal(allowed.statusCode, 200);
});
