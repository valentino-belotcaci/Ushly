import type { PublicPagePath } from './routes';
import { translations } from '../../i18n/index.ts';
import { hasLocalePrefix, type Locale } from '../../i18n/locale.ts';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function publicPageMetadata(
  path: PublicPagePath,
  siteOrigin?: string,
  locale: Locale = 'en',
  routePath: string = path,
): string {
  const page = translations(locale).public.pages[path];
  const title = `${page.pageTitle} | Ushly`;
  const canonicalPath = `/${locale}${path}`;
  const routeCanonical = siteOrigin
    ? `${siteOrigin}${canonicalPath}`
    : undefined;
  const indexable = hasLocalePrefix(routePath);
  const image = siteOrigin
    ? `${siteOrigin}/favicon-512x512-dark.png`
    : undefined;
  return `<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, follow'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ushly">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:locale" content="${locale === 'it' ? 'it_IT' : 'en_US'}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
${routeCanonical ? `<link rel="canonical" href="${escapeHtml(routeCanonical)}"><meta property="og:url" content="${escapeHtml(routeCanonical)}"><link rel="alternate" hreflang="en" href="${escapeHtml(`${siteOrigin}/en${path}`)}"><link rel="alternate" hreflang="it" href="${escapeHtml(`${siteOrigin}/it${path}`)}"><link rel="alternate" hreflang="x-default" href="${escapeHtml(`${siteOrigin}/en${path}`)}">` : ''}
${image ? `<meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:alt" content="Ushly link logo"><meta name="twitter:image" content="${escapeHtml(image)}">` : ''}`;
}
