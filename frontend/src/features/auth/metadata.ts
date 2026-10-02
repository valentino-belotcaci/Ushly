export type AuthPath = '/login' | '/register';

export function isAuthPath(path: string): path is AuthPath {
  return path === '/login' || path === '/register';
}

export function authMetadata(path: AuthPath, locale: Locale = 'en'): string {
  const login = path === '/login';
  const text = translations(locale).auth;
  return `<title>${login ? text.loginTitle : text.registerTitle} | Ushly</title>
<meta name="description" content="${login ? text.loginIntro : text.registerIntro}">
<meta name="robots" content="noindex, follow">`;
}
import { translations } from '../../i18n';
import type { Locale } from '../../i18n/locale';
