import { en } from './en.ts';
import { it } from './it.ts';
import type { Locale } from './locale.ts';

export function translations(locale: Locale) {
  return locale === 'it' ? it : en;
}
