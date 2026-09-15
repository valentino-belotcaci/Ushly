import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

import { buildApp } from '../src/app.js';
import { cleanTestDatabase, getTestEnvironment } from './helpers/test-database.js';

const password = 'a long registration passphrase';

async function setup(t: TestContext) {
  const app = await buildApp({ env: getTestEnvironment() });
  t.after(async () => { await cleanTestDatabase(app.prisma); await app.close(); });
  await app.ready();
  await cleanTestDatabase(app.prisma);
  const tokens: string[] = [];
  for (const email of ['owner-a@example.test', 'owner-b@example.test']) {
    await app.inject({ method: 'POST', url: '/auth/register', remoteAddress: email === 'owner-a@example.test' ? '127.0.0.20' : '127.0.0.21', payload: { email, password } });
    const login = await app.inject({ method: 'POST', url: '/auth/login', remoteAddress: email === 'owner-a@example.test' ? '127.0.0.20' : '127.0.0.21', payload: { email, password } });
    tokens.push(login.json().accessToken as string);
  }
  return { app, tokens };
}

test('owner CRUD and pagination deny every operation on another user link', async (t) => {
  const { app, tokens } = await setup(t);
  const created = await app.inject({ method: 'POST', url: '/links', headers: { authorization: `Bearer ${tokens[0]}` }, payload: { url: 'https://example.com/owned', title: 'Original' } });
  assert.equal(created.statusCode, 201);
  const id = created.json().id as string;

  const list = await app.inject({ method: 'GET', url: '/links?page=1&pageSize=1', headers: { authorization: `Bearer ${tokens[0]}` } });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().items[0].id, id);

  const foreignHeaders = { authorization: `Bearer ${tokens[1]}` };
  for (const request of [
    { method: 'GET', url: `/links/${id}` },
    { method: 'PATCH', url: `/links/${id}`, payload: { title: 'Hijacked' } },
    { method: 'POST', url: `/links/${id}/activate` },
    { method: 'POST', url: `/links/${id}/deactivate` },
    { method: 'DELETE', url: `/links/${id}` },
  ] as const) {
    const response = await app.inject({ ...request, headers: foreignHeaders });
    assert.equal(response.statusCode, 404, `${request.method} must enforce ownership`);
  }

  const unchanged = await app.inject({ method: 'GET', url: `/links/${id}`, headers: { authorization: `Bearer ${tokens[0]}` } });
  assert.equal(unchanged.statusCode, 200);
  assert.equal(unchanged.json().title, 'Original');
  const deleted = await app.inject({ method: 'DELETE', url: `/links/${id}`, headers: { authorization: `Bearer ${tokens[0]}` } });
  assert.equal(deleted.statusCode, 204);
});
