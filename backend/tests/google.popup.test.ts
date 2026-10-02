import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { sendGooglePopupResult } from '../src/modules/auth/google.popup.js';

test('Google callback page sends only a status to configured origins', async () => {
  const app = Fastify();
  app.get('/', (_request, reply) => sendGooglePopupResult(reply, [
    'https://app.example.test',
    'https://bad.example.test/path',
  ], { status: 'success' }));
  const response = await app.inject('/');
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['content-type'] ?? '', /text\/html/);
  assert.match(response.headers['content-security-policy'] ?? '', /script-src 'sha256-/);
  assert.match(response.body, /https:\/\/app\.example\.test/);
  assert.ok(!response.body.includes('https://bad.example.test/path'));
  assert.match(response.body, /"type":"ushly-google-oauth"/);
  assert.match(response.body, /"status":"success"/);
  assert.match(response.body, /opener\.postMessage\(message,origin\)/);
  assert.ok(!response.body.includes('postMessage(message,"*")'));
  assert.match(response.body, /window\.close\(\)/);
  assert.ok(!response.body.includes('accessToken'));
  await app.close();
});

test('Google callback failure exposes only an allowed safe code', async () => {
  const app = Fastify();
  app.get('/', (_request, reply) => sendGooglePopupResult(reply, ['https://app.example.test'], {
    status: 'error', code: 'oauth_conflict',
  }));
  const response = await app.inject('/');
  assert.match(response.body, /"status":"error","code":"oauth_conflict"/);
  await app.close();
});
