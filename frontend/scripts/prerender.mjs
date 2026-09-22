import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'vite';

// Reuse the actual public page trees. No duplicate marketing HTML or running SSR server.
await build({ build: { ssr: 'src/entry-server.tsx', outDir: '.prerender' } });
const { renderPage, publicPagePaths, authPagePaths } =
  await import('../.prerender/entry-server.js');
const template = await readFile('dist/index.html', 'utf8');

function pageHtml(path) {
  const { html, head } = renderPage(path);
  return template
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
for (const path of [...publicPagePaths, ...authPagePaths]) {
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
console.log(
  'Prerendered the public pages and wrote a non-indexable route fallback.',
);
