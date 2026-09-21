import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { homepageMetadata } from './src/features/home/metadata.ts';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const site = env.VITE_SITE_ORIGIN ? new URL(env.VITE_SITE_ORIGIN) : undefined;
  if (
    site &&
    (!['http:', 'https:'].includes(site.protocol) ||
      site.username ||
      site.password ||
      site.pathname !== '/' ||
      site.search ||
      site.hash)
  )
    throw new Error('VITE_SITE_ORIGIN must be an HTTP(S) origin');
  return {
    plugins: [
      react(),
      {
        name: 'homepage-metadata',
        transformIndexHtml: (html) =>
          html.replace('<!--page-metadata-->', homepageMetadata(site?.origin)),
      },
    ],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      clearMocks: true,
    },
  };
});
