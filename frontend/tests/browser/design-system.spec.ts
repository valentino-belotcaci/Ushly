import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [320, 768, 1440]) {
  for (const theme of ['dark', 'light']) {
    test(`${theme} theme at ${width}px: accessible and contained`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (value) => localStorage.setItem('ushly.theme', value),
        theme,
      );
      await page.goto('/dev/components');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .getByRole('button', { name: 'Primary action', exact: true })
          .evaluate((el) => getComputedStyle(el).borderRadius),
      ).toBe('12px');
      expect(
        await page.evaluate(() =>
          Array.from(document.fonts).some(
            (font) =>
              font.family.includes('Plus Jakarta Sans') &&
              font.status === 'loaded',
          ),
        ),
      ).toBe(true);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
      await page.screenshot({
        path: `test-results/preview-${theme}-${width}.png`,
        fullPage: true,
      });
    });
  }
}

test('keyboard focus, tabs and native dialog containment/restoration', async ({
  page,
}) => {
  await page.goto('/dev/components');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to components' }),
  ).toBeFocused();
  const outline = await page
    .getByRole('link', { name: 'Skip to components' })
    .evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(outline).toBe('3px');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('tab', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Details', exact: true }),
  ).toBeFocused();
  const trigger = page.getByRole('button', { name: 'Open example dialog' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'A focused conversation' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
  // Native Chromium can visit browser chrome between tab cycles (activeElement becomes body).
  // Check that it never focuses background page controls and that the next Tab returns inside.
  await page
    .getByRole('button', { name: 'Use light theme', includeHidden: true })
    .evaluate((el) => el.focus());
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const focusIsBrowserChrome = await page.evaluate(
      () => document.activeElement === document.body,
    );
    if (focusIsBrowserChrome) await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('theme persists, updates metadata and is synchronized between tabs', async ({
  page,
  context,
}) => {
  await page.goto('/dev/components');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const second = await context.newPage();
  await second.goto('/');
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#favicon')).toHaveAttribute(
    'href',
    '/favicon-32x32-light.png',
  );
  await expect(page.locator('#apple-icon')).toHaveAttribute(
    'href',
    '/favicon-180x180-light.png',
  );
  await expect(page.locator('#app-manifest')).toHaveAttribute(
    'href',
    '/manifest-light.webmanifest',
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#f7f8fa',
  );
});

test('blocked storage and reduced motion retain usable controls', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto('/dev/components');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(
    await page
      .locator('.spinner')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
});

test('long content stays inside a scrollable table on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/dev/components');
  await page
    .getByRole('cell', { name: 'Primary and supporting actions' })
    .evaluate((el) => {
      el.textContent = 'Long content '.repeat(100);
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('region', { name: 'Component reference', exact: true }),
  ).toHaveAttribute('tabindex', '0');
});

test('production build excludes the component preview and serves existing icons', async ({
  page,
  request,
}) => {
  await page.goto('http://127.0.0.1:4174/');
  await expect(
    page.getByRole('heading', { name: 'URL Shortener' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Explore the component library' }),
  ).toHaveCount(0);
  await page.goto('http://127.0.0.1:4174/dev/components');
  await expect(
    page.getByRole('heading', { name: 'Page unavailable' }),
  ).toBeVisible();
  for (const theme of ['dark', 'light']) {
    for (const size of [32, 180, 192, 512])
      expect(
        (
          await request.get(
            `http://127.0.0.1:4174/favicon-${size}x${size}-${theme}.png`,
          )
        ).status(),
      ).toBe(200);
    const manifest = await request.get(
      `http://127.0.0.1:4174/manifest-${theme}.webmanifest`,
    );
    expect(manifest.status()).toBe(200);
    expect((await manifest.json()).icons).toHaveLength(2);
  }
});
