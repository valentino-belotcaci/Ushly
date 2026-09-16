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

async function createLink(
  app: Awaited<ReturnType<typeof buildApp>>,
  shortCode: string,
  values: { status?: 'active' | 'disabled'; expiresAt?: Date | null } = {},
) {
  return app.prisma.link.create({
    data: {
      shortCode,
      destinationUrl: `https://example.com/${shortCode}`,
      status: values.status ?? 'active',
      expiresAt: values.expiresAt ?? null,
    },
  });
}

test('redirects active links with a temporary redirect', async (t) => {
  const app = await createApp(t);
  await createLink(app, 'active01');

  const response = await app.inject({
    method: 'GET',
    url: '/active01',
  });

  assert.equal(response.statusCode, 307);
  assert.equal(response.headers.location, 'https://example.com/active01');
  assert.equal(response.body, '');
});

test('returns the same safe not-found response for missing, disabled, and expired links', async (t) => {
  const app = await createApp(t);
  await createLink(app, 'disabled', { status: 'disabled' });
  await createLink(app, 'expired', {
    expiresAt: new Date(Date.now() - 1_000),
  });

  for (const shortCode of ['missing', 'disabled', 'expired']) {
    const response = await app.inject({ method: 'GET', url: `/${shortCode}` });
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), {
      error: 'link_not_found',
      message: 'Link not found',
      details: null,
    });
  }
});

test('records a local redirect latency baseline without making capacity claims', async (t) => {
  const app = await createApp(t);
  await createLink(app, 'baseline');
  const samples: number[] = [];

  for (let index = 0; index < 20; index += 1) {
    const startedAt = performance.now();
    const response = await app.inject({ method: 'GET', url: '/baseline' });
    samples.push(performance.now() - startedAt);
    assert.equal(response.statusCode, 307);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  console.log(
    `Local redirect baseline: n=${samples.length}, average=${average.toFixed(2)}ms, p95=${p95?.toFixed(2)}ms`,
  );
});
