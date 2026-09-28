import { useLocation } from 'react-router';
import { useMemo } from 'react';

export const locales = ['en', 'it'] as const;
export type Locale = (typeof locales)[number];

export function localeFromPath(pathname: string): Locale {
  return pathname === '/it' || pathname.startsWith('/it/') ? 'it' : 'en';
}

export function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(?:en|it)(?=\/|$)/);
  const path = match ? pathname.slice(match[0].length) : pathname;
  return path || '/';
}

export function localizedPath(
  path: string,
  locale: Locale,
  prefixed = true,
): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const base = stripLocale(path);
  if (locale === 'en' && !prefixed) return base;
  return base === '/' ? `/${locale}/` : `/${locale}${base}`;
}

export function localizedEquivalentPath(pathname: string): string {
  const path = stripLocale(pathname);
  const legalAliases: Record<string, string> = {
    '/privacy': '/privacy-policy',
    '/cookies': '/cookie-policy',
    '/terms': '/terms-of-service',
  };
  return legalAliases[path] ?? path;
}

export function useLocale(): Locale {
  return localeFromPath(useLocation().pathname);
}

export function useLocalizedRoute() {
  const location = useLocation();
  const locale = localeFromPath(location.pathname);
  const prefixed = /^\/(?:en|it)(?:\/|$)/.test(location.pathname);
  return useMemo(
    () => (path: string) => localizedPath(path, locale, prefixed),
    [locale, prefixed],
  );
}
