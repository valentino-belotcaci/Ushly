import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { homepageMetadata } from './src/features/home/metadata.ts';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const configuredOrigin = (name: 'VITE_API_ORIGIN' | 'VITE_SITE_ORIGIN') => {
    const value = env[name];
    if (!value) {
      if (command === 'build')
        throw new Error(`${name} is required for production builds`);
      return undefined;
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be an HTTP(S) origin`);
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.origin !== value
    )
      throw new Error(
        `${name} must be an exact HTTP(S) origin without credentials, path, query, fragment, or trailing slash`,
      );
    return url;
  };
  configuredOrigin('VITE_API_ORIGIN');
  const site = configuredOrigin('VITE_SITE_ORIGIN');
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
