import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const title = 'Free URL Shortener with QR Codes and Analytics';
const response = {
  id: 'link-1',
  shortCode: 'aB3x7Qz',
  destinationUrl: 'https://example.com/guide',
  title: null,
  expiresAt: null,
  status: 'active',
  createdAt: '2026-09-21T12:00:00.000Z',
};
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="white"/><rect x="4" y="4" width="24" height="24" fill="black"/></svg>';

for (const width of [320, 768, 1440]) {
  for (const theme of ['dark', 'light']) {
    test(`homepage ${width}px ${theme}: accessible static content`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem('ushly.theme', value),
        theme,
      );
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(
        page.getByRole('textbox', { name: 'Destination URL' }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/home-${theme}-${width}.png`,
        fullPage: true,
      });
    });
  }
}
test('anonymous keyboard shortening, copy, and persisted theme preference', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.route('**/links', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      url: 'https://example.com/guide',
    });
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ status: 201, json: response });
  });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.press('Tab');
  const input = page.getByRole('textbox', { name: 'Destination URL' });
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS('outline-width', '3px');
  await input.fill('https://example.com/guide');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Your short URL')).toHaveValue(
    'http://127.0.0.1:4173/aB3x7Qz',
  );
  await page.getByRole('button', { name: 'Copy short URL' }).click();
  await expect(page.getByText('Short link copied.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'http://127.0.0.1:4173/aB3x7Qz',
  );
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
    'ushly.theme',
  ]);
});
test('invalid input, loading and rate-limit errors are accessible and retryable', async ({
  page,
}) => {
  let finish: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route('**/links', async (route) => {
    await pending;
    await route.fulfill({
      status: 429,
      json: { secret: 'internal-diagnostic' },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Shorten URL' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a URL to shorten.');
  await expect(page.getByLabel('Destination URL')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Destination URL').fill('https://example.com');
  await page.getByRole('button', { name: 'Shorten URL' }).click();
  await expect(
    page.getByRole('button', { name: 'Shortening…' }),
  ).toBeDisabled();
  finish();
  await expect(page.getByRole('alert')).toContainText('Too many requests');
  await expect(page.getByRole('button', { name: 'Shorten URL' })).toBeEnabled();
  await expect(page.locator('body')).not.toContainText('internal-diagnostic');
});
test('owned-link QR generation and browser download use the existing protected contract', async ({
  page,
}) => {
  await page.route('**/links', (route) =>
    route.fulfill({ status: 201, json: response }),
  );
  await page.route('**/links/link-1/qr', async (route) => {
    expect(route.request().headers().authorization).toBe(
      'Bearer test-access-token',
    );
    expect(route.request().url()).not.toContain('token');
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: svg,
    });
  });
  // Session lifecycle is out of scope. The fixture supplies an in-memory test credential.
  await page.goto('/tests/browser/fixtures/shorten.html');
  await page.getByLabel('Destination URL').fill('https://example.com/guide');
  await page.getByRole('button', { name: 'Shorten URL' }).click();
  await page.getByRole('button', { name: 'Generate QR code' }).click();
  await expect(
    page.getByRole('img', { name: 'QR code for your shortened URL' }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download QR code (SVG)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ushly-aB3x7Qz.svg');
  expect(await download.failure()).toBeNull();
  await expect(page.getByText(/QR download requested/)).toBeVisible();
});
test('reduced motion disables illustrative animation and FAQ works with the keyboard', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const example of await page.locator('.url-example').all())
    await expect(example).toHaveCSS('animation-name', 'none');
  const question = page
    .locator('summary')
    .filter({ hasText: 'How does URL shortening work?' });
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Ushly saves your destination/)).toBeVisible();
});
test('production has indexable HTML and configuration-based metadata before JavaScript', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4174/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(
    page.getByRole('button', { name: 'Shorten URL' }),
  ).toBeDisabled();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://ushly.example/',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://ushly.example/',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary',
  );
  const html = await (await request.get('http://127.0.0.1:4174/')).text();
  expect(html).toContain('pseudonymous analytics');
  expect(html).toContain('What happens when a link is disabled?');
  expect(html).toContain('index, follow');
  expect(html).not.toContain('noindex');
  expect(html).not.toMatch(
    /unlimited|enterprise-grade|100% anonymous|SOC 2|GDPR compliant/i,
  );
  await context.close();
});
test('production hydration preserves saved light mode and updates metadata across routes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('ushly.theme', 'light'));
  await page.goto('http://127.0.0.1:4174/');
  await expect(
    page.getByRole('button', { name: 'Use dark theme' }),
  ).toBeVisible();
  await expect(page.getByLabel('Destination URL')).toBeEnabled();
  await page
    .getByRole('navigation', { name: 'Product', exact: true })
    .getByRole('link', { name: 'Features' })
    .click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, follow',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await page
    .getByRole('banner')
    .getByRole('link', { name: 'Ushly home' })
    .click();
  await expect(page).toHaveTitle(`${title} | Ushly`);
  expect(errors).toEqual([]);
});
