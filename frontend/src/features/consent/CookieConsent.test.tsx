import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it } from 'vitest';
import { CookieConsent } from './CookieConsent';

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

it('persists rejection while keeping essential functionality separate', async () => {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );
  await user.click(
    await screen.findByRole('button', { name: 'Reject non-essential' }),
  );
  expect(screen.queryByLabelText('Cookie consent')).not.toBeInTheDocument();
  const stored: unknown = JSON.parse(
    localStorage.getItem('ushly.cookie-consent') ?? 'null',
  );
  expect(stored).toMatchObject({
    version: 1,
    analytics: false,
    advertising: false,
  });

  view.unmount();
  render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );
  expect(await screen.findByText('Cookie settings')).toBeInTheDocument();
  expect(screen.queryByLabelText('Cookie consent')).not.toBeInTheDocument();
});

it('reopens settings so a saved preference can be changed later', async () => {
  localStorage.setItem(
    'ushly.cookie-consent',
    JSON.stringify({
      version: 1,
      analytics: false,
      advertising: false,
      updatedAt: '2026-09-23T00:00:00.000Z',
    }),
  );
  render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );
  await screen.findByText('Cookie settings');
  act(() => window.dispatchEvent(new Event('ushly:open-cookie-settings')));
  expect(
    screen.getByRole('dialog', { name: 'Cookie settings' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Always active')).toBeInTheDocument();
});
