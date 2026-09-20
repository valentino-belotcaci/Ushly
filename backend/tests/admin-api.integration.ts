import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { createLocalUser } from '../src/modules/auth/auth.repository.js';
import { hashPassword } from '../src/utils/password.js';
import { cleanTestDatabase, getTestEnvironment } from './helpers/test-database.js';

test('admin APIs enforce access, paginate, filter, disable safely, and audit actions', async (t) => {
  const app = await buildApp({ env: getTestEnvironment() });
  t.after(async () => { await cleanTestDatabase(app.prisma); await app.close(); });
  await app.ready(); await cleanTestDatabase(app.prisma);
  const passwordHash = await hashPassword('admin api test password');
  const admin = await createLocalUser(app.prisma, { email: 'api-admin@example.test', passwordHash });
  const user = await createLocalUser(app.prisma, { email: 'api-user@example.test', passwordHash });
  await app.prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
  const token = await app.jwt.sign({ sub: admin.id });
  const normalToken = await app.jwt.sign({ sub: user.id });

  assert.equal((await app.inject('/admin/users')).statusCode, 401);
  assert.equal((await app.inject({ url: '/admin/users', headers: { authorization: `Bearer ${normalToken}` } })).statusCode, 403);
  const listed = await app.inject({ url: '/admin/users?page=1&pageSize=1&search=api-user' , headers: { authorization: `Bearer ${token}` } });
  assert.equal(listed.statusCode, 200); assert.equal(listed.json().items.length, 1); assert.equal(listed.json().items[0].passwordHash, undefined);

  const disabled = await app.inject({ method: 'POST', url: `/admin/users/${user.id}/disable`, headers: { authorization: `Bearer ${token}` } });
  assert.equal(disabled.statusCode, 200); assert.ok((await app.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).disabledAt);
  const audit = await app.prisma.adminAuditEvent.findMany({ where: { targetId: user.id }, select: { action: true, metadata: true } });
  assert.deepEqual(audit, [{ action: 'user_disabled', metadata: null }]);

  const lastAdmin = await app.inject({ method: 'PATCH', url: `/admin/users/${admin.id}/role`, headers: { authorization: `Bearer ${token}` }, payload: { role: 'USER' } });
  assert.equal(lastAdmin.statusCode, 409);
});
