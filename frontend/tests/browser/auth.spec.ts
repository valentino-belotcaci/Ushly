import { expect, test } from '@playwright/test';

const user = {
  id: 'user-1',
  email: 'reader@example.test',
  createdAt: '2026-09-22T10:00:00.000Z',
};

for (const [width, theme] of [[320, 'light'], [1440, 'dark']] as const) {
  test(`registration is readable at ${width}px in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((value) => localStorage.setItem('ushly.theme', value), theme);
    await page.route('**/auth/refresh', (route) =>
      route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
    );
    let body: unknown;
    await page.route('**/auth/register', async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: user });
    });
    await page.goto('http://127.0.0.1:4174/register/');
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    const background = await page.locator('.auth-screen').evaluate((element) => {
      const style = getComputedStyle(element, '::before');
      return {
        image: style.backgroundImage,
        size: style.backgroundSize,
        position: style.backgroundPosition,
        opacity: style.opacity,
      };
    });
    expect(background.image).toContain(`ushly-auth-background-${theme}.webp`);
    expect(background.size).toBe('cover');
    expect(background.position).toBe('50% 50%');
    expect(background.opacity).toBe('0.2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440) {
      const panel = await page.locator('.auth-panel').boundingBox();
      expect(panel?.x).toBeGreaterThan(width / 2);
    }
    await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('safe-password');
    await page.getByLabel('Confirm password').fill('safe-password');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Account created.')).toBeVisible();
    expect(body).toEqual({ email: user.email, password: 'safe-password' });
  });
}

test('login creates a session and the header logs out through the backend', async ({ page }) => {
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.route('**/auth/login', (route) =>
    route.fulfill({ status: 200, json: { accessToken: 'test-access', user } }),
  );
  let logoutCalls = 0;
  await page.route('**/auth/logout', async (route) => {
    logoutCalls += 1;
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ status: 204, body: '' });
  });
  await page.goto('http://127.0.0.1:4174/login/');
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
  await page.getByLabel('Password').fill('safe-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('You’re signed in.')).toBeVisible();
  await page.getByRole('link', { name: 'Return to Ushly' }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();
  expect(logoutCalls).toBe(1);
});

test('Google completion without a session explains explicit linking', async ({ page, context }) => {
  await context.route('**/auth/google', (route) => route.fulfill({ status: 200, body: 'Google sign-in' }));
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.goto('http://127.0.0.1:4174/login/');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('http://127.0.0.1:4173/auth/google');
  await popup.close();
  await page.getByRole('button', { name: 'I’ve finished with Google' }).click();
  await expect(page.getByRole('alert')).toContainText('verify your password');
});
