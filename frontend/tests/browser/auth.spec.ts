import { expect, test } from '@playwright/test';

const user = {
  id: 'user-1',
  email: 'reader@example.test',
  createdAt: '2026-09-22T10:00:00.000Z',
};

for (const [width, theme] of [
  [320, 'light'],
  [1440, 'dark'],
] as const) {
  test(`registration is readable at ${width}px in ${theme} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (value) => localStorage.setItem('ushly.theme', value),
      theme,
    );
    await page.route('**/auth/refresh', (route) =>
      route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
    );
    let body: unknown;
    await page.route('**/auth/register', async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: user });
    });
    await page.route('**/auth/login', (route) =>
      route.fulfill({
        status: 200,
        json: { accessToken: 'test-access', user },
      }),
    );
    await page.route('**/links?**', (route) =>
      route.fulfill({
        status: 200,
        json: { items: [], page: 1, pageSize: 5, total: 0 },
      }),
    );
    await page.goto('http://127.0.0.1:4174/register/');
    await expect(
      page.getByRole('heading', { name: 'Create an account' }),
    ).toBeVisible();
    const background = await page
      .locator('.auth-screen')
      .evaluate((element) => {
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
    expect(background.opacity).toBe(theme === 'light' ? '0.8' : '0.4');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1440) {
      const panel = await page.locator('.auth-panel').boundingBox();
      expect(panel?.x).toBeGreaterThan(width / 2);
    }
    await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('safe-password');
    await page.getByLabel('Confirm password').fill('safe-password');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    expect(body).toEqual({ email: user.email, password: 'safe-password' });
  });
}

test('login creates a session and the header logs out through the backend', async ({
  page,
}) => {
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.route('**/auth/login', (route) =>
    route.fulfill({ status: 200, json: { accessToken: 'test-access', user } }),
  );
  await page.route('**/links?**', (route) =>
    route.fulfill({
      status: 200,
      json: { items: [], page: 1, pageSize: 5, total: 0 },
    }),
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
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await page
    .getByRole('complementary', { name: 'Dashboard' })
    .getByRole('button', { name: 'Log out' })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Log in to Ushly' }),
  ).toBeVisible();
  expect(logoutCalls).toBe(1);
});

test('Google completion without a session explains explicit linking', async ({
  page,
  context,
}) => {
  await context.route('**/auth/google', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<script>window.opener.postMessage({type:"ushly-google-oauth",status:"error",code:"oauth_conflict"},"http://127.0.0.1:4174");window.close()</script>',
    }),
  );
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.goto('http://127.0.0.1:4174/login/');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const popup = await popupPromise;
  await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(page.getByRole('alert')).toContainText('verify your password');
  await expect(
    page.getByRole('button', { name: 'I’ve finished with Google' }),
  ).toHaveCount(0);
});

test('Google popup success restores the session automatically', async ({
  page,
  context,
}) => {
  let refreshes = 0;
  await page.route('**/auth/refresh', (route) => {
    refreshes += 1;
    return route.fulfill(
      refreshes === 1
        ? { status: 401, json: { error: 'unauthorized' } }
        : { status: 200, json: { accessToken: 'test-access' } },
    );
  });
  await page.route('**/links?**', (route) =>
    route.fulfill({
      status: 200,
      json: { items: [], page: 1, pageSize: 5, total: 0 },
    }),
  );
  await context.route('**/auth/google', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<script>window.addEventListener("message",event=>{if(event.origin==="http://127.0.0.1:4174"&&event.data?.type==="ushly-google-oauth-ack")window.close()});window.opener.postMessage({type:"ushly-google-oauth",status:"success"},"http://127.0.0.1:4174")</script>',
    }),
  );
  await page.goto('http://127.0.0.1:4174/login/');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const popup = await popupPromise;
  await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  expect(refreshes).toBe(2);
});

test('explicit Google linking confirms success after the callback', async ({
  page,
  context,
}) => {
  let refreshes = 0;
  await page.route('**/auth/refresh', (route) => {
    refreshes += 1;
    return route.fulfill(
      refreshes === 1
        ? { status: 401, json: { error: 'unauthorized' } }
        : { status: 200, json: { accessToken: 'linked-access' } },
    );
  });
  await page.route('**/auth/login', (route) =>
    route.fulfill({
      status: 200,
      json: { accessToken: 'test-access', user, googleLinkAvailable: true },
    }),
  );
  await page.route('**/links?**', (route) =>
    route.fulfill({
      status: 200,
      json: { items: [], page: 1, pageSize: 5, total: 0 },
    }),
  );
  await page.route('**/auth/google/link', (route) =>
    route.fulfill({
      status: 200,
      json: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=1',
      },
    }),
  );
  await context.route('https://accounts.google.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<script>location.replace("http://127.0.0.1:4173/auth/google/callback")</script>',
    }),
  );
  await context.route('**/auth/google/callback', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<script>window.opener.postMessage({type:"ushly-google-oauth",status:"success"},"http://127.0.0.1:4174");window.close()</script>',
    }),
  );
  await page.goto('http://127.0.0.1:4174/login/');
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
  await page.getByLabel('Password').fill('safe-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Link Google' }).click();
  await page.getByLabel('Current password').fill('safe-password');
  await page.getByRole('button', { name: 'Verify and link Google' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Google account linked successfully.',
  );
  expect(refreshes).toBe(2);
});

test('a blocked Google popup shows a safe retry message', async ({ page }) => {
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await page.goto('http://127.0.0.1:4174/login/');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Allow the Google sign-in window',
  );
});

test('a message from another origin cannot complete Google login', async ({
  page,
  context,
}) => {
  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'unauthorized' } }),
  );
  await context.route('**/auth/google', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<script>location.replace("https://evil.example.test/finish")</script>',
    }),
  );
  await context.route('https://evil.example.test/finish', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<script>window.opener.postMessage({type:"ushly-google-oauth",status:"success"},"http://127.0.0.1:4174");window.close()</script>',
    }),
  );
  await page.goto('http://127.0.0.1:4174/login/');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(
    page.getByText(
      'Complete sign-in in the Google window. This page will update automatically.',
    ),
  ).toBeVisible();
  await expect(page.getByText('You’re signed in.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel Google sign-in' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'closed before it finished',
  );
});
