import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Writable } from 'node:stream';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { registerUser } from '../src/modules/auth/auth.service.js';
import {
  cleanTestDatabase,
  getTestEnvironment,
} from './helpers/test-database.js';

const password = 'refresh integration passphrase';
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

test('refresh sessions', async (t) => {
  const base = getTestEnvironment();
  const env = {
    ...base,
    nodeEnv: 'production' as const,
    cookie: {
      ...base.cookie,
      secure: true,
      sameSite: 'none' as const,
      maxAgeMs: 86400000,
    },
  };
  let logs = '';
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logs += chunk.toString();
      done();
    },
  });
  const app = await buildApp({ env, logger: { level: 'info', stream } });
  await app.ready();
  await cleanTestDatabase(app.prisma);
  t.after(async () => {
    try {
      await cleanTestDatabase(app.prisma);
    } finally {
      await app.close();
    }
  });
  const user = await registerUser(app.prisma, {
    email: 'refresh@example.test',
    password,
  });
  const secrets: string[] = [password, env.jwtSecret];
  async function login() {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: user.email, password },
    });
    assert.equal(response.statusCode, 200);
    return response;
  }
  function cookie(response: Awaited<ReturnType<typeof login>>) {
    const parsed = response.cookies.find(
      (entry) => entry.name === env.cookie.name,
    );
    assert.ok(parsed);
    secrets.push(parsed.value, digest(parsed.value));
    assert.ok(!response.body.includes(parsed.value));
    return parsed.value;
  }
  const post = (url: string, token?: string) =>
    app.inject({
      method: 'POST',
      url,
      headers: token ? { cookie: `${env.cookie.name}=${token}` } : {},
    });

  await t.test(
    'production cookie is HttpOnly, Secure, configured SameSite and host-only; rotation stores only hashes',
    async () => {
      const response = await login();
      const header = String(response.headers['set-cookie']);
      assert.match(header, /HttpOnly/);
      assert.match(header, /Secure/);
      assert.match(header, /SameSite=None/);
      assert.match(header, /Path=\/auth/);
      assert.doesNotMatch(header, /Domain=/);
      const old = cookie(response);
      const stored = await app.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: digest(old) },
      });
      assert.ok(!JSON.stringify(stored).includes(old));
      const rotated = await post('/auth/refresh', old);
      assert.equal(rotated.statusCode, 200);
      assert.deepEqual(Object.keys(rotated.json()).sort(), ['accessToken', 'googleLinkAvailable']);
      assert.equal(
        app.jwt.verify<{ sub: string }>(rotated.json().accessToken).sub,
        user.id,
      );
      const next = cookie(rotated);
      assert.notEqual(next, old);
      const nextStored = await app.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: digest(next) },
      });
      assert.equal(nextStored.expiresAt.getTime(), stored.expiresAt.getTime());
      const previous = await app.prisma.refreshToken.findUniqueOrThrow({
        where: { id: stored.id },
      });
      assert.ok(previous.revokedAt);
      assert.equal(previous.replacedByTokenId, nextStored.id);
    },
  );

  await t.test(
    'concurrent replay revokes the winning descendant and leaves other sessions usable',
    async () => {
      const old = cookie(await login());
      const independent = cookie(await login());
      const results = await Promise.all([
        post('/auth/refresh', old),
        post('/auth/refresh', old),
      ]);
      assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 401]);
      const winner = results.find((r) => r.statusCode === 200);
      assert.ok(winner);
      assert.equal(
        (await post('/auth/refresh', cookie(winner))).statusCode,
        401,
      );
      const replay = await post('/auth/refresh', old);
      assert.deepEqual(replay.json(), {
        error: 'unauthorized',
        message: 'Authentication required',
        details: null,
      });
      assert.equal((await post('/auth/refresh', independent)).statusCode, 200);
    },
  );

  await t.test('expired tokens cannot rotate', async () => {
    const token = cookie(await login());
    await app.prisma.refreshToken.update({
      where: { tokenHash: digest(token) },
      data: { expiresAt: new Date(0) },
    });
    assert.equal((await post('/auth/refresh', token)).statusCode, 401);
    assert.equal((await post('/auth/refresh')).statusCode, 401);
  });

  await t.test(
    'logout using an old cookie revokes its descendant and is idempotent',
    async () => {
      const old = cookie(await login());
      const next = cookie(await post('/auth/refresh', old));
      for (const token of [old, old, undefined]) {
        const response = await post('/auth/logout', token);
        assert.equal(response.statusCode, 204);
        assert.match(String(response.headers['set-cookie']), /Max-Age=0/);
        assert.match(String(response.headers['set-cookie']), /HttpOnly/);
        assert.match(String(response.headers['set-cookie']), /Secure/);
      }
      assert.equal((await post('/auth/refresh', next)).statusCode, 401);
      for (const secret of secrets) assert.ok(!logs.includes(secret));
    },
  );
});
