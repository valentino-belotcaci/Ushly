import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../src/errors/app-error.js';
import {
  MAX_DESTINATION_URL_LENGTH,
  validateDestinationUrl,
} from '../src/modules/links/link.validation.js';
import { createWithUniqueShortCode } from '../src/modules/links/short-code.js';

test('validates supported URLs and preserves the original value', () => {
  const value = 'HTTPS://Example.com/a/../b?x=1#fragment';
  assert.equal(validateDestinationUrl(value), value);
  assert.equal(validateDestinationUrl('http://localhost:8080/path'), 'http://localhost:8080/path');
});

test('rejects dangerous and unsupported URL schemes', () => {
  for (const value of ['javascript:alert(1)', 'data:text/plain,hello', 'file:///etc/passwd', '/relative']) {
    assert.throws(() => validateDestinationUrl(value), (error: unknown) =>
      error instanceof AppError && error.code === 'invalid_destination_url',
    );
  }
});

test('rejects URLs over the database maximum length', () => {
  const value = `https://example.com/${'a'.repeat(MAX_DESTINATION_URL_LENGTH)}`;
  assert.throws(() => validateDestinationUrl(value), AppError);
});

test('retries only unique short-code collisions and stops at the limit', async () => {
  const generated = ['first', 'second', 'third'];
  const attempted: string[] = [];
  const collision = { code: 'P2002', meta: { target: ['shortCode'] } };
  const result = await createWithUniqueShortCode(
    async (code) => {
      attempted.push(code);
      if (code !== 'third') throw collision;
      return { shortCode: code };
    },
    { generate: () => generated.shift() ?? 'unexpected' },
  );
  assert.deepEqual(result, { shortCode: 'third' });
  assert.deepEqual(attempted, ['first', 'second', 'third']);

  await assert.rejects(
    createWithUniqueShortCode(async () => { throw collision; }, {
      maxAttempts: 2,
      generate: () => 'same',
    }),
    (error: unknown) => error instanceof AppError && error.code === 'short_code_unavailable',
  );
});
