import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';

import { generateOwnedLinkQr } from '../src/modules/links/qr.service.js';

function fakePrisma(link: object | null): PrismaClient {
  return {
    link: { findFirst: async () => link },
  } as unknown as PrismaClient;
}

test('QR generation uses the owned short URL and returns bounded SVG', async () => {
  const svg = await generateOwnedLinkQr(
    fakePrisma({ shortCode: 'Ab12' }),
    'owner-a',
    'link-a',
    'https://ushly.example',
  );

  assert.match(svg, /^<svg[^>]*xmlns=/);
  assert.match(svg, /<path/);
  assert.ok(Buffer.byteLength(svg, 'utf8') <= 64 * 1024);
});

test('QR generation rejects links not owned by the verified user', async () => {
  await assert.rejects(
    generateOwnedLinkQr(fakePrisma(null), 'owner-a', 'foreign-link', 'https://ushly.example'),
    { code: 'link_not_found', statusCode: 404 },
  );
});
