import assert from 'node:assert/strict';
import test from 'node:test';

import { requireTestDatabase } from './helpers/test-database.js';

const safeUrl =
  'postgresql://test_user:fake_password@127.0.0.1:5432/ushly_test';
const safe = { NODE_ENV: 'test', TEST_DATABASE_URL: safeUrl };

test('test database guard accepts explicit local test configuration', () => {
  assert.equal(requireTestDatabase(safe), safeUrl);
  assert.equal(
    requireTestDatabase({ ...safe, DATABASE_URL: safeUrl }),
    safeUrl,
  );
});

test('test database guard requires NODE_ENV exactly test', () => {
  for (const nodeEnv of [
    undefined,
    '',
    'development',
    'production',
    'TEST',
    ' test',
  ]) {
    assert.throws(
      () => requireTestDatabase({ ...safe, NODE_ENV: nodeEnv }),
      /NODE_ENV exactly test/,
    );
  }
});

test('test database guard rejects missing, conflicting, and unsafe URLs without exposing input', () => {
  assert.throws(
    () => requireTestDatabase({ NODE_ENV: 'test', DATABASE_URL: safeUrl }),
    /no DATABASE_URL fallback/,
  );
  assert.throws(
    () =>
      requireTestDatabase({
        ...safe,
        DATABASE_URL: safeUrl.replace('ushly_test', 'ushly'),
      }),
    /conflicts/,
  );
  for (const url of [
    'not-a-url',
    safeUrl.replace('ushly_test', 'ushly'),
    safeUrl.replace('ushly_test', 'production_test'),
    safeUrl.replace('ushly_test', 'ushly_test_backup'),
    safeUrl.replace('127.0.0.1', 'db.example.com'),
    safeUrl.replace('postgresql:', 'https:'),
    `${safeUrl}?host=production`,
    `${safeUrl}?schema=private`,
    `${safeUrl}#fragment`,
    safeUrl.replace('/ushly_test', '/%75shly_test'),
    safeUrl.replace(':fake_password', ''),
  ]) {
    assert.throws(
      () => requireTestDatabase({ ...safe, TEST_DATABASE_URL: url }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(!error.message.includes('fake_password'));
        return true;
      },
    );
  }
});
