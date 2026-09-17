import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';

import {
  getClickTrackingMetrics,
  recordRedirectClick,
} from '../src/modules/clicks/click.service.js';
import { pseudonymizeIp } from '../src/utils/ip-pseudonymization.js';

const secret = 'a-separate-click-hash-secret-at-least-32';

test('pseudonymizes IPs with a separate secret and never returns the raw address', () => {
  const ip = '203.0.113.42';
  const first = pseudonymizeIp(ip, secret);
  const second = pseudonymizeIp(ip, secret);

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, ip);
  assert.notEqual(first, pseudonymizeIp(ip, `${secret}-different`));
});

test('click persistence receives only pseudonymized and minimized fields', async () => {
  let persisted: Record<string, unknown> | undefined;
  const prisma = {
    link: { findUnique: async () => ({ id: 'link-1' }) },
    click: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        persisted = data;
      },
    },
  } as unknown as PrismaClient;

  await recordRedirectClick(prisma, {
    linkId: 'link-1',
    ipAddress: '203.0.113.42',
    userAgent: 'a'.repeat(300),
    referrer: 'https://example.test/path?private=value',
    ipHashSecret: secret,
  });

  assert.ok(persisted);
  assert.equal(persisted?.linkId, 'link-1');
  assert.equal(persisted?.ipHash, pseudonymizeIp('203.0.113.42', secret));
  assert.equal(persisted?.userAgent, 'a'.repeat(256));
  assert.equal(persisted?.referrer, 'https://example.test');
  assert.equal(persisted?.countryCode, null);
  assert.ok(!JSON.stringify(persisted).includes('203.0.113.42'));
  assert.ok(!JSON.stringify(persisted).includes('private=value'));
});

test('click persistence failures are observable and remain bounded to the click path', async () => {
  const before = getClickTrackingMetrics().trackingFailures;
  const prisma = {
    link: { findUnique: async () => ({ id: 'link-1' }) },
    click: { create: async () => { throw new Error('database failure'); } },
  } as unknown as PrismaClient;

  await assert.rejects(
    recordRedirectClick(prisma, {
      linkId: 'link-1',
      ipAddress: '203.0.113.42',
      userAgent: undefined,
      referrer: undefined,
      ipHashSecret: secret,
    }),
    /Click tracking failed/,
  );
  assert.equal(getClickTrackingMetrics().trackingFailures, before + 1);
});
