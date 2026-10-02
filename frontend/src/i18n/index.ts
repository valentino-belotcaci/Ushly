import { en } from './en.ts';
import { it } from './it.ts';
import type { Locale } from './locale.ts';
import type { EnglishTranslation } from './en.ts';

export type Translation = EnglishTranslation;

function shapeDifference(
  left: unknown,
  right: unknown,
  path = 'translations',
): string | null {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right))
      return `${path} must be an array in both locales`;
    if (left.length !== right.length)
      return `${path} has ${left.length} English items and ${right.length} Italian items`;
    for (let index = 0; index < left.length; index += 1) {
      const difference = shapeDifference(
        left[index],
        right[index],
        `${path}[${index}]`,
      );
      if (difference) return difference;
    }
    return null;
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord).sort();
    const rightKeys = Object.keys(rightRecord).sort();
    const missing = leftKeys.find((key) => !(key in rightRecord));
    if (missing) return `${path}.${missing} is missing from Italian`;
    const extra = rightKeys.find((key) => !(key in leftRecord));
    if (extra) return `${path}.${extra} exists only in Italian`;
    for (const key of leftKeys) {
      const difference = shapeDifference(
        leftRecord[key],
        rightRecord[key],
        `${path}.${key}`,
      );
      if (difference) return difference;
    }
    return null;
  }
  return typeof left === typeof right
    ? null
    : `${path} has different value types`;
}

export function assertTranslationParity() {
  const difference = shapeDifference(en, it);
  if (difference)
    throw new Error(`English and Italian translations differ: ${difference}.`);
}

if (import.meta.env?.DEV) assertTranslationParity();

export function translations(locale: Locale) {
  return locale === 'it' ? it : en;
}
