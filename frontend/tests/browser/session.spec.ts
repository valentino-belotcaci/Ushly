import { expect, test } from '@playwright/test';

test('reload restores from an HttpOnly cookie without exposing the access token', async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: 'ushly_refresh_test',
      value: 'opaque-refresh-value',
      domain: '127.0.0.1',
      path: '/auth',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  let refreshes = 0;
  await page.route('**/auth/refresh', async (route) => {
    refreshes += 1;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().cookie).toContain(
      'ushly_refresh_test=opaque-refresh-value',
    );
    await route.fulfill({
      status: 200,
      json: { accessToken: 'browser-access' },
    });
  });
  await page.goto('http://127.0.0.1:4174/');
  await expect.poll(() => refreshes).toBe(1);
  await page.reload();
  await expect.poll(() => refreshes).toBe(2);
  const visible = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    cookie: document.cookie,
    url: location.href,
  }));
  expect(JSON.stringify(visible)).not.toContain('browser-access');
  expect(JSON.stringify(visible)).not.toContain('opaque-refresh-value');
});
