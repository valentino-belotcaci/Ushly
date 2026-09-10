import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';

import {
  cleanTestDatabase,
  getTestEnvironment,
} from './helpers/test-database.js';

const env = getTestEnvironment();

test('plugin owns a shared working client, probes PostgreSQL, and disconnects on close', async (t) => {
  const app = await buildApp({ env });
  t.after(() => app.close());
  const disconnect = t.mock.method(app.prisma, '$disconnect');
  const query = t.mock.method(app.prisma, '$queryRaw');
  await app.register(async (child) => {
    assert.equal(child.prisma, app.prisma);
  });
  await app.ready();
  assert.equal(query.mock.callCount(), 1);
  assert.equal((await app.inject('/health/ready')).statusCode, 200);
  assert.equal(query.mock.callCount(), 2);

  await cleanTestDatabase(app.prisma);
  const email = 'prisma-lifecycle@example.test';
  try {
    const created = await app.prisma.user.create({ data: { email } });
    const loaded = await app.prisma.user.findUnique({
      where: { id: created.id },
    });
    assert.equal(loaded?.email, email);
  } finally {
    await cleanTestDatabase(app.prisma);
  }
  await app.close();
  assert.equal(disconnect.mock.callCount(), 1);
  await assert.rejects(app.inject('/health/live'), /closed|closing|destroyed/i);
});

test('cleanup is repeatable, removes related and anonymous data, and preserves migration history', async (t) => {
  const app = await buildApp({ env });
  t.after(async () => {
    try {
      await cleanTestDatabase(app.prisma);
    } finally {
      await app.close();
    }
  });
  await app.ready();
  await cleanTestDatabase(app.prisma);
  const historyBefore = await app.prisma
    .$queryRaw`SELECT migration_name, checksum FROM _prisma_migrations ORDER BY migration_name`;
  const user = await app.prisma.user.create({
    data: { email: 'cleanup@example.test' },
  });
  const link = await app.prisma.link.create({
    data: {
      userId: user.id,
      shortCode: 'cleanup-owned',
      destinationUrl: 'https://example.test/',
    },
  });
  await app.prisma.link.create({
    data: {
      shortCode: 'cleanup-anonymous',
      destinationUrl: 'https://example.test/',
    },
  });
  await app.prisma.click.create({
    data: { linkId: link.id, ipHash: 'a'.repeat(64) },
  });
  await app.prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: 'b'.repeat(64),
      expiresAt: new Date('2030-01-01T00:00:00Z'),
    },
  });

  await assert.rejects(
    cleanTestDatabase(app.prisma, { ...process.env, NODE_ENV: 'development' }),
    /NODE_ENV exactly test/,
  );
  assert.equal(await app.prisma.user.count(), 1);
  await cleanTestDatabase(app.prisma);
  await cleanTestDatabase(app.prisma);
  assert.deepEqual(
    await Promise.all([
      app.prisma.user.count(),
      app.prisma.link.count(),
      app.prisma.click.count(),
      app.prisma.refreshToken.count(),
    ]),
    [0, 0, 0, 0],
  );
  assert.deepEqual(
    await app.prisma
      .$queryRaw`SELECT migration_name, checksum FROM _prisma_migrations ORDER BY migration_name`,
    historyBefore,
  );
});
