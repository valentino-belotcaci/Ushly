import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'vite';

// Reuse the actual public page trees. No duplicate marketing HTML or running SSR server.
await build({ build: { ssr: 'src/entry-server.tsx', outDir: '.prerender' } });
const {
  renderPage,
  publicPagePaths,
  localizedPublicPagePaths,
  authPagePaths,
  localizedAuthPagePaths,
  prerenderSiteOrigin,
} = await import('../.prerender/entry-server.js');
const template = await readFile('dist/index.html', 'utf8');
if (!prerenderSiteOrigin) {
  throw new Error(
    'VITE_SITE_ORIGIN is required to generate production canonical URLs, sitemap.xml, and robots.txt.',
  );
}

function pageHtml(path) {
  const { html, head } = renderPage(path);
  return template
    .replace('<html lang="en"', `<html lang="${path === '/it/' || path.startsWith('/it/') ? 'it' : 'en'}"`)
    .replace(
      /<meta id="page-metadata-start"[^>]*>[\s\S]*?<meta id="page-metadata-end"[^>]*>/,
      `<meta id="page-metadata-start" name="ushly:metadata-start" content="">${head}<meta id="page-metadata-end" name="ushly:metadata-end" content="">`,
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="true">${html}</div>`,
    );
}

await writeFile('dist/index.html', pageHtml('/'));
for (const path of [
  ...publicPagePaths,
  ...localizedPublicPagePaths,
  ...authPagePaths,
  ...localizedAuthPagePaths,
]) {
  const directory = `dist${path}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, pageHtml(path));
}
// Deployers can use this shell as the fallback for routes other than the homepage.
await writeFile(
  'dist/200.html',
  template.replace(
    /<meta id="page-metadata-start"[^>]*>[\s\S]*?<meta id="page-metadata-end"[^>]*>/,
    '<meta id="page-metadata-start" name="ushly:metadata-start" content=""><title>Ushly · Page unavailable</title><meta name="robots" content="noindex, follow"><meta id="page-metadata-end" name="ushly:metadata-end" content="">',
  ),
);
const urls = [...new Set(localizedPublicPagePaths)]
  .map((path) => `  <url><loc>${prerenderSiteOrigin}${path}</loc></url>`)
  .join('\n');
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
await writeFile(
  'dist/robots.txt',
  `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /register\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /dev/\nDisallow: /en/login\nDisallow: /en/register\nDisallow: /en/dashboard\nDisallow: /en/admin\nDisallow: /en/dev/\nDisallow: /it/login\nDisallow: /it/register\nDisallow: /it/dashboard\nDisallow: /it/admin\nDisallow: /it/dev/\nSitemap: ${prerenderSiteOrigin}/sitemap.xml\n`,
);
console.log(
  'Prerendered the public pages, wrote robots.txt and sitemap.xml, and wrote a non-indexable route fallback.',
);
