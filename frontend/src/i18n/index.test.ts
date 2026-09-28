import { expect, it } from 'vitest';
import { assertTranslationParity } from './index';

it('keeps English and Italian translation structures in parity', () => {
  expect(() => assertTranslationParity()).not.toThrow();
});
