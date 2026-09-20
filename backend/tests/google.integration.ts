import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { Writable } from 'node:stream';
import test, { type TestContext } from 'node:test';
import { OAuth2Client } from 'google-auth-library';
import { buildApp } from '../src/app.js';
import { registerUser, loginUser } from '../src/modules/auth/auth.service.js';
import { stateKey } from '../src/modules/auth/google.state.js';
import {
  cleanTestDatabase,
  getTestEnvironment,
} from './helpers/test-database.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const password = 'oauth-test-password-should-never-appear';
const providerAccess = 'private-google-access-token';
const providerRefresh = 'private-google-refresh-token';
const authorizationCode = 'private-authorization-code';
const base = 'http://127.0.0.1:4173';

async function fixture(t: TestContext, secure = false) {
  const origin = secure ? 'https://127.0.0.1:4173' : base;
  const env = {
    ...getTestEnvironment(undefined, { redisUrl: 'redis://127.0.0.1:6379' }),
    nodeEnv: secure ? ('production' as const) : ('test' as const),
    trustProxy: secure ? ['127.0.0.1'] : false,
    cookie: { ...getTestEnvironment().cookie, secure, maxAgeMs: 60000 },
    google: {
      clientId: 'test-client',
      clientSecret: 'private-client-secret',
      redirectUri: `${origin}/auth/google/callback`,
      stateTtlSeconds: 300,
    },
  };
  let logs = '';
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logs += chunk.toString();
      done();
    },
  });
  const app = await buildApp({ env, logger: { stream, level: 'info' } });
  await app.ready();
  await cleanTestDatabase(app.prisma);
  const keys: string[] = [];
  const secrets: string[] = [];
  t.after(async () => {
    try {
      if (keys.length) await app.redis.del(keys);
      await cleanTestDatabase(app.prisma);
    } finally {
      await app.close();
    }
  });
  let auth: URL;
  let claims: Record<string, unknown> = {};
  let exchangeFailure = false;
  let invalidSignature = false;
  let missingToken = false;
  let issuedIdToken = '';
  let calls = 0;
  t.mock.method(
    OAuth2Client.prototype,
    'getFederatedSignonCertsAsync',
    async () => ({
      certs: {
        test: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      },
      format: 'PEM',
    }),
  );
  t.mock.method(
    OAuth2Client.prototype,
    'getToken',
    async (options: {
      code: string;
      codeVerifier: string;
      redirect_uri: string;
    }) => {
      calls++;
      assert.equal(options.code, authorizationCode);
      assert.equal(options.redirect_uri, env.google.redirectUri);
      assert.equal(
        createHash('sha256').update(options.codeVerifier).digest('base64url'),
        auth.searchParams.get('code_challenge'),
      );
      if (exchangeFailure)
        throw new Error(
          `${providerAccess} ${providerRefresh} ${env.google.clientSecret} ${authorizationCode}`,
        );
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: 'https://accounts.google.com',
        aud: env.google.clientId,
        sub: 'google-subject',
        email: 'google@example.test',
        email_verified: true,
        nonce: auth.searchParams.get('nonce'),
        iat: now,
        exp: now + 3600,
        ...claims,
      };
      const head = Buffer.from(
        JSON.stringify({ alg: 'RS256', kid: 'test' }),
      ).toString('base64url');
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = sign(
        'RSA-SHA256',
        Buffer.from(`${head}.${body}`),
        privateKey,
      ).toString('base64url');
      issuedIdToken = `${head}.${body}.${invalidSignature ? 'invalid-signature' : signature}`;
      return {
        tokens: {
          access_token: providerAccess,
          refresh_token: providerRefresh,
          ...(missingToken ? {} : { id_token: issuedIdToken }),
        },
      };
    },
  );
  async function start(link?: { id: string; password?: string }) {
    const response = await app.inject(
      link
        ? {
            method: 'POST',
            url: `${origin}/auth/google/link`,
            headers: {
              authorization: `Bearer ${app.jwt.sign({ sub: link.id })}`,
            },
            payload: { password: link.password ?? password },
          }
        : {
            url: `${origin}/auth/google`,
            headers: secure ? { 'x-forwarded-proto': 'https' } : {},
          },
    );
    assert.equal(response.statusCode, link ? 200 : 302, response.body);
    auth = new URL(
      link
        ? response.json().authorizationUrl
        : (response.headers.location ?? ''),
    );
    assert.equal(auth.origin, 'https://accounts.google.com');
    assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(auth.searchParams.get('redirect_uri'), env.google.redirectUri);
    assert.equal(auth.searchParams.get('access_type'), 'online');
    const state = auth.searchParams.get('state');
    assert.ok(state);
    keys.push(stateKey(state));
    const raw = await app.redis.get(stateKey(state));
    assert.ok(raw);
    const transaction = JSON.parse(raw);
    assert.ok(!raw.includes(state));
    assert.ok((await app.redis.ttl(stateKey(state))) <= 300);
    secrets.push(state, transaction.verifier, transaction.nonce);
    const cookie = response.cookies.find((c) => c.name.endsWith('_google'));
    assert.ok(cookie?.httpOnly);
    assert.equal(cookie.sameSite, 'Lax');
    return { state, cookie: `${cookie.name}=${cookie.value}` };
  }
  async function callback(
    attempt: { state: string; cookie: string },
    suffix = `code=${authorizationCode}`,
    headers = {},
  ) {
    return app.inject({
      url: `${origin}/auth/google/callback?state=${attempt.state}&${suffix}`,
      headers: {
        cookie: attempt.cookie,
        'sec-fetch-site': 'cross-site',
        ...(secure ? { 'x-forwarded-proto': 'https' } : {}),
        ...headers,
      },
    });
  }
  async function assertEmpty() {
    assert.equal(await app.prisma.user.count(), 0);
    assert.equal(await app.prisma.userIdentity.count(), 0);
    assert.equal(await app.prisma.refreshToken.count(), 0);
  }
  function assertPrivate(responseBody: string) {
    for (const secret of [
      password,
      providerAccess,
      providerRefresh,
      authorizationCode,
      env.google.clientSecret,
      issuedIdToken,
      ...secrets,
    ].filter(Boolean)) {
      assert.ok(!logs.includes(String(secret)), `secret reached logs`);
      assert.ok(
        !responseBody.includes(String(secret)),
        `secret reached response`,
      );
    }
  }
  return {
    app,
    env,
    start,
    callback,
    assertEmpty,
    assertPrivate,
    setClaims: (value: Record<string, unknown>) => {
      claims = value;
    },
    failExchange: () => {
      exchangeFailure = true;
    },
    badSignature: () => {
      invalidSignature = true;
    },
    noIdToken: () => {
      missingToken = true;
    },
    calls: () => calls,
    assertNotLogged: (secret: string) => assert.ok(!logs.includes(secret)),
  };
}

test('Google creates passwordless account, issues rotating Ushly session, and reuses identity', async (t) => {
  const f = await fixture(t);
  const attempt = await f.start();
  const response = await f.callback(attempt);
  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(response.json(), { ok: true });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
  assert.equal(response.headers.location, undefined);
  const user = await f.app.prisma.user.findUniqueOrThrow({
    where: { email: 'google@example.test' },
    include: { identities: true },
  });
  assert.equal(user.provider, 'google');
  assert.equal(user.providerId, 'google-subject');
  assert.equal(user.passwordHash, null);
  assert.equal(user.identities.length, 1);
  assert.equal(user.role, 'USER');
  const cookie = response.cookies.find((c) => c.name === f.env.cookie.name);
  assert.ok(cookie?.httpOnly);
  assert.equal(cookie.path, '/auth');
  const stored = await f.app.prisma.refreshToken.findFirstOrThrow();
  assert.equal(
    stored.tokenHash,
    createHash('sha256').update(cookie.value).digest('hex'),
  );
  const refreshed = await f.app.inject({
    method: 'POST',
    url: '/auth/refresh',
    headers: { cookie: `${cookie.name}=${cookie.value}` },
  });
  assert.equal(refreshed.statusCode, 200);
  assert.equal(
    f.app.jwt.verify<{ sub: string }>(refreshed.json().accessToken).sub,
    user.id,
  );
  f.assertNotLogged(cookie.value);
  f.assertNotLogged(refreshed.json().accessToken);
  assert.notEqual(
    refreshed.cookies.find((c) => c.name === cookie.name)?.value,
    cookie.value,
  );
  assert.equal((await f.callback(attempt)).statusCode, 400);
  assert.equal(f.calls(), 1);
  assert.equal((await f.callback(await f.start())).statusCode, 200);
  assert.equal(await f.app.prisma.user.count(), 1);
  f.assertPrivate(response.body);
});

test('state is browser-bound, single-use under concurrent callbacks, and expiring', async (t) => {
  const f = await fixture(t);
  const attempt = await f.start();
  assert.equal((await f.callback({ ...attempt, cookie: '' })).statusCode, 400);
  const results = await Promise.all([f.callback(attempt), f.callback(attempt)]);
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 400]);
  assert.equal(f.calls(), 1);
  const expired = await f.start();
  await f.app.redis.pExpire(stateKey(expired.state), 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal((await f.callback(expired)).statusCode, 400);
  const wrong = await f.start();
  assert.equal(
    (await f.callback({ ...wrong, state: 'x'.repeat(43) })).statusCode,
    400,
  );
  assert.equal((await f.callback(wrong)).statusCode, 400);
});

for (const mode of [
  'cancel',
  'exchange',
  'pkce',
  'nonce',
  'issuer',
  'audience',
  'azp',
  'expired',
  'future',
  'subject',
  'missing-email',
  'unverified',
  'signature',
  'missing-token',
  'duplicate-state',
  'missing-code',
]) {
  test(`Google safely rejects ${mode} without accounts or sessions`, async (t) => {
    const f = await fixture(t);
    const attempt = await f.start();
    let suffix = `code=${authorizationCode}`;
    if (mode === 'cancel')
      suffix = `error=access_denied&error_description=${providerAccess}`;
    if (mode === 'exchange') f.failExchange();
    if (mode === 'signature') f.badSignature();
    if (mode === 'missing-token') f.noIdToken();
    if (mode === 'duplicate-state') suffix += `&state=${attempt.state}`;
    if (mode === 'missing-code') suffix = '';
    const overrides: Record<string, Record<string, unknown>> = {
      nonce: { nonce: 'wrong' },
      issuer: { iss: 'https://evil.test' },
      audience: { aud: 'other-client' },
      azp: { azp: 'other-client' },
      expired: { exp: 1 },
      future: { iat: Math.floor(Date.now() / 1000) + 600 },
      subject: { sub: '' },
      'missing-email': { email: undefined },
      unverified: { email_verified: false },
    };
    if (overrides[mode]) f.setClaims(overrides[mode]);
    if (mode === 'pkce') {
      const raw = await f.app.redis.get(stateKey(attempt.state));
      assert.ok(raw);
      const transaction = JSON.parse(raw);
      transaction.verifier = 'x'.repeat(43);
      await f.app.redis.set(
        stateKey(attempt.state),
        JSON.stringify(transaction),
        { EX: 300 },
      );
    }
    const response = await f.callback(attempt, suffix);
    assert.equal(response.statusCode, 400, response.body);
    assert.ok(!response.cookies.some((c) => c.name === f.env.cookie.name));
    assert.ok(
      response.cookies.some(
        (c) => c.name.endsWith('_google') && c.value === '',
      ),
    );
    assert.equal((await f.callback(attempt)).statusCode, 400);
    await f.assertEmpty();
    f.assertPrivate(response.body);
  });
}

test('local email collision never links; explicit password-confirmed linking preserves local login and ownership', async (t) => {
  const f = await fixture(t);
  const local = await registerUser(f.app.prisma, {
    email: 'google@example.test',
    password,
  });
  const before = await f.app.prisma.user.findUniqueOrThrow({
    where: { id: local.id },
  });
  assert.equal((await f.callback(await f.start())).statusCode, 409);
  assert.equal(await f.app.prisma.userIdentity.count(), 0);
  assert.equal(await f.app.prisma.refreshToken.count(), 0);
  const response = await f.callback(await f.start({ id: local.id }));
  assert.equal(response.statusCode, 200, response.body);
  const after = await f.app.prisma.user.findUniqueOrThrow({
    where: { id: local.id },
    include: { identities: true },
  });
  assert.equal(after.provider, 'local');
  assert.equal(after.providerId, null);
  assert.equal(after.passwordHash, before.passwordHash);
  assert.equal(after.identities[0]?.providerId, 'google-subject');
  assert.equal(
    (await loginUser(f.app.prisma, { email: local.email, password })).id,
    local.id,
  );
  assert.equal((await f.callback(await f.start())).statusCode, 200);
  assert.equal(await f.app.prisma.user.count(), 1);
  f.assertPrivate(response.body);
});

test('linking requires authentication and correct password; ignores no client-selected account', async (t) => {
  const f = await fixture(t);
  const local = await registerUser(f.app.prisma, {
    email: 'local@example.test',
    password,
  });
  for (const [headers, payload, expected] of [
    [{}, { password }, 401],
    [
      { authorization: `Bearer ${f.app.jwt.sign({ sub: local.id })}` },
      { password: 'wrong' },
      400,
    ],
    [
      { authorization: `Bearer ${f.app.jwt.sign({ sub: local.id })}` },
      { password, userId: 'another' },
      400,
    ],
  ] as const) {
    const response = await f.app.inject({
      method: 'POST',
      url: `${base}/auth/google/link`,
      headers,
      payload,
    });
    assert.equal(response.statusCode, expected);
  }
  assert.equal(await f.app.prisma.userIdentity.count(), 0);
});

test('identity cannot link to a second user or replace an existing mapping', async (t) => {
  const f = await fixture(t);
  const first = await registerUser(f.app.prisma, {
    email: 'first@example.test',
    password,
  });
  const second = await registerUser(f.app.prisma, {
    email: 'second@example.test',
    password,
  });
  assert.equal(
    (await f.callback(await f.start({ id: first.id }))).statusCode,
    200,
  );
  assert.equal(
    (await f.callback(await f.start({ id: second.id }))).statusCode,
    409,
  );
  f.setClaims({ sub: 'different-google-subject' });
  assert.equal(
    (await f.callback(await f.start({ id: first.id }))).statusCode,
    409,
  );
  assert.equal(await f.app.prisma.userIdentity.count(), 1);
});

for (const change of ['disabled', 'deleted', 'password-changed']) {
  test(`link callback rejects ${change} local user`, async (t) => {
    const f = await fixture(t);
    const user = await registerUser(f.app.prisma, {
      email: 'local@example.test',
      password,
    });
    const attempt = await f.start({ id: user.id });
    if (change === 'deleted')
      await f.app.prisma.user.delete({ where: { id: user.id } });
    else
      await f.app.prisma.user.update({
        where: { id: user.id },
        data:
          change === 'disabled'
            ? { disabledAt: new Date() }
            : { passwordHash: 'changed' },
      });
    assert.equal((await f.callback(attempt)).statusCode, 400);
    assert.equal(await f.app.prisma.userIdentity.count(), 0);
    assert.equal(await f.app.prisma.refreshToken.count(), 0);
  });
}

test('disabled Google users and changed provider email cannot log in', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.callback(await f.start())).statusCode, 200);
  f.setClaims({ email: 'changed@example.test' });
  assert.equal((await f.callback(await f.start())).statusCode, 400);
  f.setClaims({});
  await f.app.prisma.user.updateMany({ data: { disabledAt: new Date() } });
  assert.equal((await f.callback(await f.start())).statusCode, 400);
  assert.equal(await f.app.prisma.refreshToken.count(), 1);
});

test('concurrent identity resolution creates one identity and account', async (t) => {
  const f = await fixture(t);
  const { resolveGoogleUser } =
    await import('../src/modules/auth/google.repository.js');
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      resolveGoogleUser(
        f.app.prisma,
        { subject: 'race', email: 'race@example.test' },
        null,
      ),
    ),
  );
  assert.ok(results.some((r) => r.status === 'fulfilled'));
  assert.equal(await f.app.prisma.user.count(), 1);
  assert.equal(await f.app.prisma.userIdentity.count(), 1);
});

test('configured callback origin is exact and client redirect overrides are rejected', async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.app.inject(`${base}/auth/google?redirect_uri=https://evil.test`))
      .statusCode,
    400,
  );
  assert.equal(
    (await f.app.inject('http://evil.test/auth/google')).statusCode,
    400,
  );
  const attempt = await f.start();
  assert.equal(
    (
      await f.app.inject({
        url: `http://evil.test/auth/google/callback?state=${attempt.state}&code=${authorizationCode}`,
        headers: { cookie: attempt.cookie },
      })
    ).statusCode,
    400,
  );
  assert.equal(f.calls(), 0);
  assert.equal(
    (
      await f.app.inject({
        url: `http://evil.test/auth/google/callback?state=${attempt.state}&code=${authorizationCode}`,
        headers: {
          cookie: attempt.cookie,
          'x-forwarded-host': '127.0.0.1:4173',
          'x-forwarded-proto': 'http',
        },
      })
    ).statusCode,
    400,
  );
  const invalidPath = await f.app.inject(
    `${base}/auth/google/callback/?code=${authorizationCode}`,
  );
  assert.equal(invalidPath.statusCode, 400);
  f.assertPrivate(invalidPath.body);
  await f.assertEmpty();
});

test('Redis outage fails closed without issuing a Google authorization request or session', async (t) => {
  const f = await fixture(t);
  const attempt = await f.start();
  // Remove this test's key before disconnecting; unrelated Redis keys are untouched.
  await f.app.redis.del(stateKey(attempt.state));
  t.mock.method(f.app.redis, 'withCommandOptions', () => {
    throw new Error('redis-private-connection-details');
  });
  const response = await f.callback(attempt);
  assert.equal(response.statusCode, 400);
  assert.equal(f.calls(), 0);
  assert.equal((await f.app.inject(`${base}/auth/google`)).statusCode, 400);
  await f.assertEmpty();
});

test('OAuth starts and callbacks are rate limited and cross-site linking is rejected', async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.app.inject({
        method: 'POST',
        url: `${base}/auth/google/link`,
        headers: { origin: 'https://evil.test' },
        payload: { password },
      })
    ).statusCode,
    403,
  );
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await f.app.inject(`${base}/auth/google?invalid=1`)).statusCode,
      400,
    );
  assert.equal((await f.app.inject(`${base}/auth/google`)).statusCode, 429);
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await f.app.inject(`${base}/auth/google/callback`)).statusCode,
      400,
    );
  assert.equal(
    (await f.app.inject(`${base}/auth/google/callback`)).statusCode,
    429,
  );
});

test('migration guard rejects inconsistent mappings and backfills valid legacy Google subjects', async (t) => {
  const f = await fixture(t);
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile(
    new URL(
      '../prisma/migrations/20260920120000_add_google_identity/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const guard = sql.match(/DO \$\$[\s\S]*?END \$\$;/)?.[0];
  const backfill = sql.match(
    /INSERT INTO "UserIdentity"[\s\S]*?WHERE provider = 'google';/,
  )?.[0];
  assert.ok(guard);
  assert.ok(backfill);
  const inconsistent = await f.app.prisma.user.create({
    data: { email: 'invalid@example.test', provider: 'google' },
  });
  await assert.rejects(
    f.app.prisma.$executeRawUnsafe(guard),
    /Inconsistent legacy Google mappings/,
  );
  assert.equal(await f.app.prisma.userIdentity.count(), 0);
  await f.app.prisma.user.update({
    where: { id: inconsistent.id },
    data: { providerId: 'legacy-subject' },
  });
  await f.app.prisma.$executeRawUnsafe(guard);
  await f.app.prisma.$executeRawUnsafe(backfill);
  const identity = await f.app.prisma.userIdentity.findUniqueOrThrow({
    where: {
      provider_providerId: { provider: 'google', providerId: 'legacy-subject' },
    },
  });
  assert.equal(identity.userId, inconsistent.id);
  assert.equal(identity.email, 'invalid@example.test');
  f.setClaims({ sub: 'legacy-subject', email: identity.email });
  assert.equal((await f.callback(await f.start())).statusCode, 200);
});

test('production OAuth cookies are Secure, HttpOnly and host-only', async (t) => {
  const f = await fixture(t, true);
  const attempt = await f.start();
  const response = await f.callback(attempt);
  assert.equal(response.statusCode, 200, response.body);
  for (const cookie of response.cookies) {
    assert.equal(cookie.secure, true);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.domain, undefined);
  }
});

test('disabled user is rechecked at session issuance after identity resolution', async (t) => {
  const f = await fixture(t);
  const user = await registerUser(f.app.prisma, {
    email: 'local@example.test',
    password,
  });
  await f.app.prisma.user.update({
    where: { id: user.id },
    data: { disabledAt: new Date() },
  });
  const { startSession } =
    await import('../src/modules/auth/refresh.service.js');
  await assert.rejects(startSession(f.app.prisma, user.id, 60000));
  assert.equal(await f.app.prisma.refreshToken.count(), 0);
});
