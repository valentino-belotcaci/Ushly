import { legalPages, type LegalPagePath } from './content';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function legalPageMetadata(path: LegalPagePath, siteOrigin?: string) {
  const page = legalPages[path];
  const title = `${page.pageTitle} | Ushly`;
  const canonical = siteOrigin ? `${siteOrigin}${path}` : undefined;
  return `<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ushly">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:url" content="${escapeHtml(canonical)}">` : ''}`;
}
