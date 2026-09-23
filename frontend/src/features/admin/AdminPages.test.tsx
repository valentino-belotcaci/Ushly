import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../api/session';
import { AdminLinksPage, AdminUsersPage } from './AdminPages';
import { listAdminLinks, listAdminUsers } from './api';

vi.mock('./api', () => ({
  listAdminUsers: vi.fn(),
  listAdminLinks: vi.fn(),
  getAdminStatistics: vi.fn(),
  setAdminUserDisabled: vi.fn(),
  setAdminLinkDisabled: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it('shows a safe unauthorized state when the backend denies admin access', async () => {
  vi.mocked(listAdminUsers).mockRejectedValue(
    new ApiClientError(
      'http',
      403,
      'forbidden',
      'You do not have permission to do that.',
    ),
  );
  render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole('heading', {
      name: 'Administrator access required',
    }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Disable' }),
  ).not.toBeInTheDocument();
});

it('renders backend-provided users and supported disable controls', async () => {
  vi.mocked(listAdminUsers).mockResolvedValue({
    items: [
      {
        id: 'user-1',
        email: 'owner@example.test',
        name: null,
        provider: 'local',
        role: 'USER',
        disabledAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>,
  );
  expect(await screen.findByText('owner@example.test')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
});

it('shows link owner email as the primary owner detail', async () => {
  vi.mocked(listAdminLinks).mockResolvedValue({
    items: [
      {
        id: 'link-1',
        userId: 'user-1',
        ownerEmail: 'owner@example.test',
        shortCode: 'owner-link',
        destinationUrl: 'https://example.test/destination',
        title: null,
        status: 'active',
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  render(
    <MemoryRouter>
      <AdminLinksPage />
    </MemoryRouter>,
  );
  expect(await screen.findByText('owner@example.test')).toBeInTheDocument();
  expect(screen.getByText('ID: user-1')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Apply filters' }),
  ).not.toBeInTheDocument();
});
