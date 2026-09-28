import { localizedLegalPath, type LegalPagePath } from './routes';
import { translations } from '../../i18n';
import type { Locale } from '../../i18n/locale';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function legalPageMetadata(
  path: LegalPagePath,
  siteOrigin?: string,
  locale: Locale = 'en',
  routePath: string = path,
) {
  const page = translations(locale).legal.pages[path];
  const title = `${page.pageTitle} | Ushly`;
  const canonical = siteOrigin ? `${siteOrigin}${routePath}` : undefined;
  const localized = localizedLegalPath(path);
  return `<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ushly">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:locale" content="${locale === 'it' ? 'it_IT' : 'en_US'}">
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:url" content="${escapeHtml(canonical)}"><link rel="alternate" hreflang="en" href="${escapeHtml(`${siteOrigin}/en${localized}`)}"><link rel="alternate" hreflang="it" href="${escapeHtml(`${siteOrigin}/it${localized}`)}"><link rel="alternate" hreflang="x-default" href="${escapeHtml(`${siteOrigin}${path}`)}">` : ''}`;
}
