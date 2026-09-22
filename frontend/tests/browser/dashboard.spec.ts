import { expect, test } from '@playwright/test';

test('an anonymous dashboard visitor is redirected to login', async ({
  page,
}) => {
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.goto('http://127.0.0.1:4174/dashboard/links');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Log in to Ushly' }),
  ).toBeVisible();
});

test('the authenticated mobile dashboard uses its responsive sidebar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      json: { accessToken: 'test-access', googleLinkAvailable: false },
    }),
  );
  await page.route('**/links?**', (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      status: 200,
      json: {
        items: [],
        page: Number(url.searchParams.get('page') ?? 1),
        pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        total: 0,
      },
    });
  });
  await page.goto('http://127.0.0.1:4174/dashboard');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Dashboard navigation' }),
  ).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Dashboard navigation' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Links' }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
  await expect(
    page.getByRole('heading', { name: 'Links', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Dashboard navigation' }),
  ).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
