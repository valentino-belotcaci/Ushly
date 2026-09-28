import { translations } from '../../i18n/index.ts';
import type { Locale } from '../../i18n/locale.ts';

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
export function homepageMetadata(
  siteOrigin?: string,
  locale: Locale = 'en',
  routePath = '/',
): string {
  const home = translations(locale).home;
  const title = `${home.title} | Ushly`;
  const image = siteOrigin
    ? `${siteOrigin}/favicon-512x512-dark.png`
    : undefined;
  return `<title>${escape(title)}</title>
<meta name="description" content="${escape(home.description)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ushly">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(home.description)}">
<meta property="og:locale" content="${locale === 'it' ? 'it_IT' : 'en_US'}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(home.description)}">
${siteOrigin ? `<link rel="canonical" href="${escape(`${siteOrigin}${routePath}`)}"><meta property="og:url" content="${escape(`${siteOrigin}${routePath}`)}"><link rel="alternate" hreflang="en" href="${escape(`${siteOrigin}/en/`)}"><link rel="alternate" hreflang="it" href="${escape(`${siteOrigin}/it/`)}"><link rel="alternate" hreflang="x-default" href="${escape(`${siteOrigin}/`)}">` : ''}
${image ? `<meta property="og:image" content="${escape(image)}"><meta property="og:image:alt" content="Ushly link logo"><meta name="twitter:image" content="${escape(image)}"><meta name="twitter:image:alt" content="Ushly link logo">` : ''}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Ushly', inLanguage: locale, description: home.description, ...(siteOrigin ? { url: `${siteOrigin}${routePath}` } : {}) }).replaceAll('<', '\\u003c')}</script>`;
}
