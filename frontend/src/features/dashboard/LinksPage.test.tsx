import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ToastProvider';
import type { OwnedLink } from './api';
import { LinksPage } from './LinksPage';

const mocks = vi.hoisted(() => ({
  createOwnedLink: vi.fn(),
  deleteOwnedLink: vi.fn(),
  getOwnedQr: vi.fn(),
  setOwnedLinkActive: vi.fn(),
  updateOwnedLink: vi.fn(),
  useOwnedLinks: vi.fn(),
  reload: vi.fn(),
  copy: vi.fn(),
  createObjectUrl: vi.fn(() => 'blob:owner-qr'),
  revokeObjectUrl: vi.fn(),
}));

vi.mock('./api', () => ({
  createOwnedLink: mocks.createOwnedLink,
  deleteOwnedLink: mocks.deleteOwnedLink,
  getOwnedQr: mocks.getOwnedQr,
  setOwnedLinkActive: mocks.setOwnedLinkActive,
  updateOwnedLink: mocks.updateOwnedLink,
  publicShortUrl: (shortCode: string) => `https://u.test/${shortCode}`,
}));

vi.mock('./useOwnedLinks', () => ({
  useOwnedLinks: mocks.useOwnedLinks,
}));

const link: OwnedLink = {
  id: 'link-1',
  shortCode: 'abc123',
  destinationUrl: 'https://example.com/a/very/long/destination',
  title: 'Launch page',
  expiresAt: '2027-09-22T10:00:00.000Z',
  status: 'active',
  createdAt: '2026-09-22T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useOwnedLinks.mockReturnValue({
    data: { items: [link], page: 1, pageSize: 20, total: 1 },
    loading: false,
    error: '',
    reload: mocks.reload,
  });
  mocks.createOwnedLink.mockResolvedValue(link);
  mocks.deleteOwnedLink.mockResolvedValue(undefined);
  mocks.getOwnedQr.mockResolvedValue(
    new Blob(['<svg></svg>'], { type: 'image/svg+xml' }),
  );
  mocks.reload.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mocks.copy },
  });
  vi.stubGlobal('URL', URL);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  URL.createObjectURL = mocks.createObjectUrl;
  URL.revokeObjectURL = mocks.revokeObjectUrl;
});

function renderPage() {
  render(
    <ToastProvider>
      <LinksPage />
    </ToastProvider>,
  );
}

it('validates destinations before creating an owned link', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Shorten link' }));
  expect(screen.getByText('Enter a destination URL.')).toBeVisible();
  expect(mocks.createOwnedLink).not.toHaveBeenCalled();
  await user.type(
    screen.getByLabelText('Destination URL'),
    'javascript:alert(1)',
  );
  await user.click(screen.getByRole('button', { name: 'Shorten link' }));
  expect(screen.getByText('Use an HTTP or HTTPS URL.')).toBeVisible();
  expect(mocks.createOwnedLink).not.toHaveBeenCalled();
});

it('displays an active link with a past UTC expiration as expired', () => {
  mocks.useOwnedLinks.mockReturnValue({
    data: {
      items: [{ ...link, expiresAt: '2020-01-01T00:00:00.000Z' }],
      page: 1,
      pageSize: 20,
      total: 1,
    },
    loading: false,
    error: '',
    reload: mocks.reload,
  });
  renderPage();
  expect(screen.getByText('Expired')).toBeVisible();
  expect(screen.queryByText('Active')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Disable link' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit link' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Delete link' })).toBeVisible();
});

it('restores active status and its disable action for a future expiration', () => {
  renderPage();
  expect(screen.getByText('Active')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Disable link' })).toBeVisible();
});

it('copies, previews owner QR, and confirms deletion', async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(mocks.copy);
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Copy' }));
  expect(mocks.copy).toHaveBeenCalledWith('https://u.test/abc123');
  expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'QR' }));
  expect(mocks.getOwnedQr).toHaveBeenCalledWith('link-1');
  expect(
    await screen.findByRole('heading', { name: 'Download QR code' }),
  ).toBeVisible();
  expect(
    await screen.findByRole('img', { name: /QR code for/ }),
  ).toHaveAttribute('src', 'blob:owner-qr');
  expect(screen.getByRole('link', { name: 'Download SVG' })).toHaveAttribute(
    'download',
    'ushly-abc123.svg',
  );
  await user.click(screen.getByRole('button', { name: 'Close dialog' }));

  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.getByRole('heading', { name: 'Delete link?' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Delete link' }));
  expect(mocks.deleteOwnedLink).toHaveBeenCalledWith('link-1');
});
