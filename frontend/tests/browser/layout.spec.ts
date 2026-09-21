import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [320, 768, 1440]) {
  for (const theme of ['dark', 'light']) {
    test(`application layout: ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem('ushly.theme', value),
        theme,
      );
      await page.goto('/');
      await expect(
        page.getByRole('banner').getByRole('link', { name: 'Ushly home' }),
      ).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      const navigation = page.getByRole('navigation', {
        name: 'Primary',
        exact: true,
      });
      if (width < 1024) {
        await expect(navigation).toBeHidden();
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
      }
      await expect(navigation).toBeVisible();
      await expect(
        navigation.getByRole('link', { name: 'Get started' }),
      ).toHaveCSS('border-radius', '12px');
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
        path: `test-results/layout-${theme}-${width}.png`,
        fullPage: true,
      });
    });
  }
}

test('desktop header places brand, primary links, account links and theme control in order', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const banner = page.getByRole('banner');
  const positions = await banner.evaluate((header) => {
    const selectors = [
      '.brand-link',
      '.primary-links',
      '.account-links a:first-child',
      '.account-links a:last-child',
      '.theme-toggle',
    ];
    return selectors.map((selector) => {
      const element = header.querySelector(selector);
      if (!element) throw new Error(`Missing header element: ${selector}`);
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right };
    });
  });
  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1];
    const current = positions[index];
    if (!previous || !current) throw new Error('Missing header position');
    expect(previous.right).toBeLessThanOrEqual(current.left);
  }
});

test('mobile disclosure keyboard order, Escape, navigation and breakpoint changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const menu = page.getByRole('button', { name: /menu/i });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  const navigation = page.getByRole('navigation', {
    name: 'Primary',
    exact: true,
  });
  await expect(
    navigation.getByRole('link', { name: 'URL Shortener' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    navigation.getByRole('link', { name: 'QR Codes' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(navigation).toBeHidden();
  await page.keyboard.press('Space');
  await navigation.getByRole('link', { name: 'QR Codes' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('QR Codes');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(navigation).toBeHidden();
  await menu.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(menu).toBeHidden();
  await expect(navigation).toBeVisible();
  await navigation
    .getByRole('link', { name: 'Analytics', exact: true })
    .focus();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('theme icon, tooltip, keyboard switching and persistence', async ({
  page,
}) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Use light theme' });
  await toggle.focus();
  await expect(toggle).toHaveCSS('outline-width', '3px');
  await expect(page.getByRole('tooltip')).toHaveText('Use light theme');
  await expect(toggle.locator('svg circle')).toHaveCount(1);
  await page.keyboard.press('Enter');
  const darkToggle = page.getByRole('button', { name: 'Use dark theme' });
  await expect(darkToggle.locator('svg circle')).toHaveCount(0);
  await expect(page.getByRole('tooltip')).toHaveText('Use dark theme');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await darkToggle.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.getByRole('tooltip').hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
});

test('footer links reach placeholders and browser history keeps mobile menu closed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  const destinations = await footer.locator('li a').evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute('href'),
      label: link.textContent,
    })),
  );
  for (const destination of destinations) {
    await footer
      .getByRole('link', { name: destination.label ?? '', exact: true })
      .click();
    await expect(page).toHaveURL(destination.href ?? '/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      destination.href === '/'
        ? 'Free URL Shortener with QR Codes and Analytics'
        : (destination.label ?? ''),
    );
  }
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.goBack();
  await expect(
    page.getByRole('navigation', { name: 'Primary', exact: true }),
  ).toBeHidden();
});
