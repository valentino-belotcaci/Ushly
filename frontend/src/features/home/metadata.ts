import { homeDescription, homeTitle } from './content.ts';

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
export function homepageMetadata(siteOrigin?: string): string {
  const title = `${homeTitle} | Ushly`;
  const image = siteOrigin
    ? `${siteOrigin}/favicon-512x512-dark.png`
    : undefined;
  return `<title>${escape(title)}</title>
<meta name="description" content="${escape(homeDescription)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ushly">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(homeDescription)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(homeDescription)}">
${siteOrigin ? `<link rel="canonical" href="${escape(siteOrigin)}/"><meta property="og:url" content="${escape(siteOrigin)}/">` : ''}
${image ? `<meta property="og:image" content="${escape(image)}"><meta property="og:image:alt" content="Ushly link logo"><meta name="twitter:image" content="${escape(image)}"><meta name="twitter:image:alt" content="Ushly link logo">` : ''}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Ushly', description: homeDescription, ...(siteOrigin ? { url: `${siteOrigin}/` } : {}) }).replaceAll('<', '\\u003c')}</script>`;
}
