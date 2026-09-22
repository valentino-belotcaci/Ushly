import { publicPages, type PublicPagePath } from './content';

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
): string {
  const page = publicPages[path];
  const title = `${page.pageTitle} | Ushly`;
  const canonical = siteOrigin ? `${siteOrigin}${path}` : undefined;
  const image = siteOrigin
    ? `${siteOrigin}/favicon-512x512-dark.png`
    : undefined;
  return `<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ushly">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:url" content="${escapeHtml(canonical)}">` : ''}
${image ? `<meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:alt" content="Ushly link logo"><meta name="twitter:image" content="${escapeHtml(image)}">` : ''}`;
}
