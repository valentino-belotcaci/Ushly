import assert from 'node:assert/strict';
import test from 'node:test';

import { hashPassword, verifyPassword } from '../src/utils/password.js';

test('password hashing uses Argon2id, independent salts, and verifies exact passwords', async () => {
  const password = '  A test password — 密碼  ';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.match(first, /^\$argon2id\$v=19\$/);
  assert.deepEqual(first.split('$')[3]?.split(',').sort(), [
    'm=65536',
    'p=1',
    't=3',
  ]);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password, second), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword(password.trim(), first), false);
});

test('malformed password hashes fail closed', async () => {
  for (const hash of ['', 'not-a-hash', '$argon2id$broken']) {
    assert.equal(await verifyPassword('test password', hash), false);
  }
});
