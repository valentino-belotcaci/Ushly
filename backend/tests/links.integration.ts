import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

import { buildApp } from '../src/app.js';
import {
  cleanTestDatabase,
  getTestEnvironment,
} from './helpers/test-database.js';

async function createApp(t: TestContext) {
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
  return app;
}

test('creates anonymous and authenticated links with approved fields', async (t) => {
  const app = await createApp(t);
  const anonymous = await app.inject({
    method: 'POST',
    url: '/links',
    remoteAddress: '127.0.0.2',
    payload: {
      url: 'HTTPS://Example.com/a/../b?x=1',
      title: 'Example',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  assert.equal(anonymous.statusCode, 201);
  const anonymousBody = anonymous.json();
  assert.equal(anonymousBody.destinationUrl, 'HTTPS://Example.com/a/../b?x=1');
  assert.equal(anonymousBody.title, 'Example');
  assert.equal(anonymousBody.status, 'active');
  assert.equal((await app.prisma.link.findUnique({ where: { id: anonymousBody.id } }))?.userId, null);

  const registration = await app.inject({
    method: 'POST',
    url: '/auth/register',
    remoteAddress: '127.0.0.3',
    payload: { email: 'links@example.test', password: 'a long registration passphrase' },
  });
  assert.equal(registration.statusCode, 201);
  const login = await app.inject({
    method: 'POST',
    url: '/auth/login',
    remoteAddress: '127.0.0.3',
    payload: { email: 'links@example.test', password: 'a long registration passphrase' },
  });
  const authenticated = await app.inject({
    method: 'POST',
    url: '/links',
    headers: { authorization: `Bearer ${login.json().accessToken}` },
    payload: { url: 'https://example.com/private', title: 'Private' },
  });
  assert.equal(authenticated.statusCode, 201);
  assert.equal(
    (await app.prisma.link.findUnique({ where: { id: authenticated.json().id } }))?.userId,
    registration.json().id,
  );
});

test('rejects invalid URLs and invalid authentication', async (t) => {
  const app = await createApp(t);
  for (const url of ['javascript:alert(1)', 'data:text/plain,x', 'https://example.com/' + 'a'.repeat(2048)]) {
    const response = await app.inject({ method: 'POST', url: '/links', payload: { url } });
    assert.ok([400, 422].includes(response.statusCode));
  }
  const response = await app.inject({
    method: 'POST',
    url: '/links',
    headers: { authorization: 'Bearer invalid' },
    payload: { url: 'https://example.com' },
  });
  assert.equal(response.statusCode, 401);
});

test('applies the stricter anonymous rate limit', async (t) => {
  const app = await createApp(t);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await app.inject({
      method: 'POST',
      url: '/links',
      remoteAddress: '127.0.0.9',
      payload: { url: `https://example.com/${attempt}` },
    });
    assert.equal(response.statusCode, 201);
  }
  const limited = await app.inject({
    method: 'POST',
    url: '/links',
    remoteAddress: '127.0.0.9',
    payload: { url: 'https://example.com/limited' },
  });
  assert.equal(limited.statusCode, 429);
});
