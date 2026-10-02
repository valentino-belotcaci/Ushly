import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -- --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      env: {
        VITE_API_ORIGIN: 'http://127.0.0.1:4173',
        VITE_SITE_ORIGIN: 'https://ushly.example',
      },
    },
    {
      command: 'npm run build && npm run preview -- --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
      env: {
        VITE_API_ORIGIN: 'http://127.0.0.1:4173',
        VITE_SITE_ORIGIN: 'https://ushly.example',
      },
    },
  ],
});
