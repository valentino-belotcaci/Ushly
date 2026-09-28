import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiSession } from '../../api/session';
import { ToastProvider } from '../../components/ToastProvider';
import { SettingsPage } from './SettingsPage';
import { MemoryRouter } from 'react-router';

beforeEach(() => vi.restoreAllMocks());

function renderSettings(googleLinkAvailable: boolean) {
  vi.spyOn(apiSession, 'getSnapshot').mockReturnValue({
    status: 'authenticated',
    user: {
      id: 'user-1',
      email: 'owner@example.test',
      createdAt: '2026-09-22T10:00:00.000Z',
    },
    googleLinkAvailable,
  });
  render(
    <MemoryRouter>
      <ToastProvider>
        <SettingsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

it('shows the Google linking action only when the session allows linking', () => {
  renderSettings(true);
  expect(
    screen.getByRole('heading', { name: 'Authentication methods' }),
  ).toBeVisible();
  expect(screen.getByText('owner@example.test')).toBeVisible();
  expect(screen.getByText('Not linked')).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Link Google account' }),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
});

it('shows linked status without another linking action', () => {
  renderSettings(false);
  expect(screen.getByText('Google account linked')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Link Google account' }),
  ).not.toBeInTheDocument();
});
