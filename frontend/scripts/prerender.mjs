import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'vite';

// Reuse the actual homepage tree. No duplicate marketing HTML or running SSR server.
await build({ build: { ssr: 'src/entry-server.tsx', outDir: '.prerender' } });
const { renderHomepage } = await import('../.prerender/entry-server.js');
const { html, head } = renderHomepage();
const template = await readFile('dist/index.html', 'utf8');
await writeFile(
  'dist/index.html',
  template
    .replace(
      /<meta id="page-metadata-start"[^>]*>[\s\S]*?<meta id="page-metadata-end"[^>]*>/,
      `<meta id="page-metadata-start" name="ushly:metadata-start" content="">${head}<meta id="page-metadata-end" name="ushly:metadata-end" content="">`,
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="true">${html}</div>`,
    ),
);
// Deployers can use this shell as the fallback for routes other than the homepage.
await writeFile(
  'dist/200.html',
  template.replace(
    /<meta id="page-metadata-start"[^>]*>[\s\S]*?<meta id="page-metadata-end"[^>]*>/,
    '<meta id="page-metadata-start" name="ushly:metadata-start" content=""><title>Ushly · Page unavailable</title><meta name="robots" content="noindex, follow"><meta id="page-metadata-end" name="ushly:metadata-end" content="">',
  ),
);
console.log(
  'Prerendered the public homepage and wrote a non-indexable route fallback.',
);
