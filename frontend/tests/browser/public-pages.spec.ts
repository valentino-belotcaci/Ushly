import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  isPublicPagePath,
  publicPages,
} from '../../src/features/public-pages/content';

for (const path of Object.keys(publicPages).filter(isPublicPagePath)) {
  for (const width of [320, 768, 1440]) {
    test(`${path} is indexable and usable at ${width}px`, async ({
      page,
      request,
    }) => {
      const content = publicPages[path];
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://127.0.0.1:4174${path}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        content.title,
      );
      await expect(page).toHaveTitle(`${content.pageTitle} | Ushly`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        content.description,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        `${content.pageTitle} | Ushly`,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://ushly.example${path}`,
      );
      await expect(
        page
          .getByRole('main')
          .getByRole('link', { name: content.heroActions[0].label })
          .first(),
      ).toHaveAttribute('href', content.heroActions[0].to);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 320) {
        const html = await (
          await request.get(`http://127.0.0.1:4174${path}/`)
        ).text();
        expect(html).toContain(content.title);
        expect(html).toContain(`https://ushly.example${path}`);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
    });
  }
}

test('standalone FAQ remains unavailable and non-indexable', async ({
  page,
}) => {
  await page.goto('/faq');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Page unavailable',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, follow',
  );
});
