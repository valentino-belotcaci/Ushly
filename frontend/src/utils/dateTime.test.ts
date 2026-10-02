import { expect, it } from 'vitest';
import { formatDateTime } from './dateTime';

it('formats a UTC timestamp with an unambiguous readable date and 24-hour time', () => {
  expect(
    formatDateTime('2026-09-24T13:26:00.000Z', { timeZone: 'UTC' }),
  ).toBe('24 Sep 2026, 13:26');
});
