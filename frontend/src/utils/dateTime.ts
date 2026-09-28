type DateTimeOptions = {
  fallback?: string;
  includeTime?: boolean;
  timeZone?: string;
};

const displayLocale = 'en-GB';

function dateFrom(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(
  value: string | Date | null,
  options: DateTimeOptions = {},
): string {
  const { fallback = '—', includeTime = true, timeZone } = options;
  if (!value) return fallback;
  const date = dateFrom(value);
  if (!date) return fallback;
  const parts = new Intl.DateTimeFormat(displayLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? { hour: '2-digit' as const, minute: '2-digit' as const, hourCycle: 'h23' as const }
      : {}),
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  const dateText = `${part('day')} ${part('month').slice(0, 3)} ${part('year')}`;
  return includeTime
    ? `${dateText}, ${part('hour')}:${part('minute')}`
    : dateText;
}

export function formatFullDateTime(
  value: string | Date,
  timeZone?: string,
): string {
  const date = dateFrom(value);
  if (!date) return 'Invalid date';
  return new Intl.DateTimeFormat(displayLocale, {
    dateStyle: 'full',
    timeStyle: 'long',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}
