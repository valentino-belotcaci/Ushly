import type { Page } from '@playwright/test';

export async function setEssentialCookieConsent(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ushly.cookie-consent',
      JSON.stringify({
        version: 1,
        analytics: false,
        advertising: false,
        updatedAt: '2026-09-29T00:00:00.000Z',
      }),
    );
  });
}
