import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import type { OwnedLink } from './api';
import { OverviewPage } from './OverviewPage';

const mocks = vi.hoisted(() => ({
  useOwnedLinks: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('./useOwnedLinks', () => ({
  useOwnedLinks: mocks.useOwnedLinks,
}));

const baseLink: OwnedLink = {
  id: 'active-link',
  shortCode: 'active1',
  destinationUrl: 'https://example.com/active',
  title: 'Active link',
  expiresAt: '2099-01-01T00:00:00.000Z',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useOwnedLinks.mockReturnValue({
    data: {
      items: [
        baseLink,
        {
          ...baseLink,
          id: 'expired-link',
          shortCode: 'expired1',
          title: 'Expired link',
          expiresAt: '2020-01-01T00:00:00.000Z',
        },
        {
          ...baseLink,
          id: 'disabled-expired-link',
          shortCode: 'disabled1',
          title: 'Disabled expired link',
          expiresAt: '2020-01-01T00:00:00.000Z',
          status: 'disabled',
        },
      ],
      page: 1,
      pageSize: 5,
      total: 3,
    },
    loading: false,
    error: '',
    reload: mocks.reload,
  });
});

it('renders active, expired, and disabled statuses with disabled taking priority', () => {
  render(
    <MemoryRouter initialEntries={['/en/dashboard']}>
      <OverviewPage />
    </MemoryRouter>,
  );

  expect(screen.getByText('Active')).toBeVisible();
  expect(screen.getByText('Expired')).toBeVisible();
  expect(screen.getByText('Disabled')).toBeVisible();
  expect(screen.getByText('Active on this page').parentElement).toHaveTextContent(
    '1',
  );
});
