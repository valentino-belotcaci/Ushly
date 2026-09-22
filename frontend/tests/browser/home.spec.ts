import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import jsQR from 'jsqr';
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
  await expect(
    page.getByRole('link', { name: 'Create free account' }).first(),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  const input = page.getByRole('textbox', { name: 'Destination URL' });
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS('outline-width', '3px');
  await input.fill('https://example.com/guide');
  await page.keyboard.press('Enter');
  await expect(page.locator('.shorten-result__url')).toHaveText(
    'http://127.0.0.1:4173/aB3x7Qz',
  );
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Shorten link' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a URL to shorten.');
  await expect(page.getByLabel('Destination URL')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Destination URL').fill('https://example.com');
  await page.getByRole('button', { name: 'Shorten link' }).click();
  await expect(
    page.getByRole('button', { name: 'Shortening…' }),
  ).toBeDisabled();
  finish();
  await expect(page.getByRole('alert')).toContainText('Too many requests');
  await expect(
    page.getByRole('button', { name: 'Shorten link' }),
  ).toBeEnabled();
  await expect(page.locator('body')).not.toContainText('internal-diagnostic');
});
for (const width of [320, 1440]) {
  for (const theme of ['dark', 'light']) {
    test(`anonymous QR download decodes exact public URL: ${width}px ${theme}`, async ({
      page,
      context,
    }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem('ushly.theme', value),
        theme,
      );
      const apiRequests: string[] = [];
      const scripts: string[] = [];
      page.on('request', (request) => {
        if (['fetch', 'xhr'].includes(request.resourceType()))
          apiRequests.push(request.url());
        if (request.resourceType() === 'script') scripts.push(request.url());
      });
      await page.route('**/links', async (route) => {
        expect(route.request().headers().authorization).toBeUndefined();
        await route.fulfill({ status: 201, json: response });
      });
      await page.goto('http://127.0.0.1:4174/');
      await page
        .getByLabel('Destination URL')
        .fill('https://example.com/private-destination?secret=not-for-qr');
      await page.getByRole('button', { name: 'Shorten link' }).click();
      const shortUrl = await page.locator('.shorten-result__url').innerText();
      await page.getByRole('button', { name: 'Copy' }).click();
      await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
      await expect(page.locator('.home-hero')).toHaveCSS(
        'grid-template-columns',
        width === 320 ? /^\d+(\.\d+)?px$/ : /^\d+(\.\d+)?px \d+(\.\d+)?px$/,
      );
      expect(scripts.some((url) => /\/browser-[^/]+\.js$/.test(url))).toBe(
        false,
      );
      const generate = page.getByRole('button', { name: 'QR' });
      await generate.focus();
      await page.keyboard.press('Enter');
      await expect(
        page.getByRole('img', { name: 'QR code for your shortened URL' }),
      ).toBeVisible();
      await expect(
        page.getByRole('dialog', { name: 'Download your QR code' }),
      ).toBeVisible();
      expect(scripts.some((url) => /\/browser-[^/]+\.js$/.test(url))).toBe(
        true,
      );
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('link', { name: 'Download QR code (SVG)' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('ushly-aB3x7Qz.svg');
      expect(await download.failure()).toBeNull();
      const path = await download.path();
      if (!path) throw new Error('Missing downloaded SVG');
      const svg = await readFile(path, 'utf8');
      expect(Buffer.byteLength(svg)).toBeLessThanOrEqual(64 * 1024);
      expect(svg).not.toMatch(
        /private-destination|not-for-qr|test-access-token/,
      );
      // Rasterize the actual downloaded artifact, then decode it with an independent test-only decoder.
      const pixels = await page.evaluate(async (markup) => {
        const url = URL.createObjectURL(
          new Blob([markup], { type: 'image/svg+xml' }),
        );
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas unavailable');
          context.drawImage(image, 0, 0, 512, 512);
          return Array.from(context.getImageData(0, 0, 512, 512).data);
        } finally {
          URL.revokeObjectURL(url);
        }
      }, svg);
      expect(jsQR(new Uint8ClampedArray(pixels), 512, 512)?.data).toBe(
        shortUrl,
      );
      expect(apiRequests).toEqual([
        'http://127.0.0.1:4173/auth/refresh',
        'http://127.0.0.1:4173/links',
      ]);
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
    });
  }
}
test('anonymous QR failure can be retried without shortening again', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    let first = true;
    URL.createObjectURL = (blob) => {
      if (first) {
        first = false;
        throw new Error('internal-detail');
      }
      return create(blob);
    };
  });
  await page.route('**/links', (route) =>
    route.fulfill({ status: 201, json: response }),
  );
  await page.goto('/');
  await page.getByLabel('Destination URL').fill('https://example.com');
  await page.getByRole('button', { name: 'Shorten link' }).click();
  await page.getByRole('button', { name: 'QR' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Could not generate a QR code. Please try again.',
  );
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('link', { name: 'Download QR code (SVG)' }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('reduced motion disables illustrative animation and FAQ works with the keyboard', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.url-example-typed')).toBeHidden();
  await expect(page.locator('.url-example-static')).toBeVisible();
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
    page.getByRole('button', { name: 'Shorten link' }),
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
    'index, follow',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://ushly.example/features',
  );
  await page
    .getByRole('banner')
    .getByRole('link', { name: 'Ushly home' })
    .click();
  await expect(page).toHaveTitle(`${title} | Ushly`);
  expect(errors).toEqual([]);
});
