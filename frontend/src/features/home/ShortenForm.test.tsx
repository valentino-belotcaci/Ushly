import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { ShortenForm } from './ShortenForm';
import { HomePage } from './HomePage';

vi.mock('../../config/public', () => ({
  apiOrigin: 'https://api.example',
  siteOrigin: 'https://ushly.example',
}));
const fetchMock = vi.fn<typeof fetch>();
const linkResponse = () =>
  Response.json(
    { id: 'link-1', shortCode: 'aB3x7Qz', status: 'active' },
    { status: 201 },
  );
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:qr-fixture'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());
function setup(accessToken?: string) {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter>
      <ShortenForm {...(accessToken ? { accessToken } : {})} />
    </MemoryRouter>,
  );
  return { user, ...view };
}
async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('Destination URL'),
    'https://example.com/a-long-page',
  );
  await user.click(screen.getByRole('button', { name: 'Shorten URL' }));
}
it.each(['', 'not-a-url', 'javascript:alert(1)', 'ftp://example.com/file'])(
  'rejects invalid destination %s without making a request',
  async (url) => {
    const { user } = setup();
    if (url) await user.type(screen.getByLabelText('Destination URL'), url);
    await user.click(screen.getByRole('button', { name: 'Shorten URL' }));
    expect(screen.getByLabelText('Destination URL')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Destination URL')).toHaveFocus();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it('shows empty/loading/success, posts the real contract and copies without storing credentials', async () => {
  const { user } = setup();
  expect(
    screen.getByText('Your shortened URL will appear here.'),
  ).toBeInTheDocument();
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await submit(user);
  expect(screen.getByRole('button', { name: 'Shortening…' })).toBeDisabled();
  expect(screen.getByRole('form')).toHaveAttribute('aria-busy', 'true');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => finish(linkResponse()));
  expect(await screen.findByLabelText('Your short URL')).toHaveValue(
    'https://api.example/aB3x7Qz',
  );
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe('https://api.example/links');
  expect(init?.body).toBe(
    JSON.stringify({ url: 'https://example.com/a-long-page' }),
  );
  expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  expect(init?.credentials).toBe('omit');
  const clipboard = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue();
  await user.click(screen.getByRole('button', { name: 'Copy short URL' }));
  expect(clipboard).toHaveBeenCalledWith('https://api.example/aB3x7Qz');
  expect(screen.getByText('Short link copied.')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Generate QR code' }),
  ).not.toBeInTheDocument();
  expect(localStorage.length).toBe(0);
});
it.each([401, 403, 404, 422, 429, 500])(
  'shows a safe API error for %s without leaking the body or retrying anonymously',
  async (status) => {
    fetchMock.mockResolvedValueOnce(
      new Response('secret-internal-diagnostic', { status }),
    );
    const { user } = setup('test-access-token');
    await submit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('secret-internal-diagnostic');
    expect(document.body).not.toHaveTextContent('test-access-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Shorten URL' })).toBeEnabled();
  },
);
it('handles network failures and malformed short codes safely', async () => {
  const { user } = setup();
  fetchMock.mockRejectedValueOnce(new Error('internal-secret'));
  await submit(user);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Check your connection',
  );
  fetchMock.mockResolvedValueOnce(
    Response.json({
      id: 'link-1',
      shortCode: '//attacker.example',
      status: 'active',
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Shorten URL' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'invalid response',
  );
  expect(screen.queryByLabelText('Your short URL')).not.toBeInTheDocument();
});
it('provides a manual-copy fallback', async () => {
  const { user } = setup();
  fetchMock.mockResolvedValueOnce(linkResponse());
  await submit(user);
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
    new Error('denied'),
  );
  await user.click(screen.getByRole('button', { name: 'Copy short URL' }));
  expect(screen.getByText(/Select the short link/)).toBeInTheDocument();
  expect(screen.getByLabelText('Your short URL')).toHaveAttribute('readonly');
});
it('generates an owned QR with a header token, downloads it and revokes its object URL', async () => {
  const { user, unmount } = setup('test-access-token');
  fetchMock.mockResolvedValueOnce(linkResponse());
  await submit(user);
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await user.click(screen.getByRole('button', { name: 'Generate QR code' }));
  expect(screen.getByRole('button', { name: 'Generating QR…' })).toBeDisabled();
  await act(async () =>
    finish(
      new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', {
        headers: { 'Content-Type': 'image/svg+xml' },
      }),
    ),
  );
  const download = await screen.findByRole('link', {
    name: 'Download QR code (SVG)',
  });
  expect(download).toHaveAttribute('download', 'ushly-aB3x7Qz.svg');
  expect(download).toHaveAttribute('href', 'blob:qr-fixture');
  fireEvent.click(download);
  expect(screen.getByText(/QR download requested/)).toBeInTheDocument();
  const [requestUrl, options] = fetchMock.mock.calls[1] ?? [];
  expect(requestUrl).toBe('https://api.example/links/link-1/qr');
  expect(new Headers(options?.headers).get('Authorization')).toBe(
    'Bearer test-access-token',
  );
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:qr-fixture');
});
it('allows QR retry after a failure and rejects non-SVG responses', async () => {
  const { user } = setup('test-access-token');
  fetchMock.mockResolvedValueOnce(linkResponse());
  await submit(user);
  fetchMock.mockResolvedValueOnce(
    new Response('no permission', { status: 403 }),
  );
  await user.click(screen.getByRole('button', { name: 'Generate QR code' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('permission');
  fetchMock.mockResolvedValueOnce(
    new Response('<html>secret</html>', {
      headers: { 'Content-Type': 'text/html' },
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Generate QR code' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('could not be read'),
  );
  expect(
    screen.queryByRole('link', { name: /Download QR/ }),
  ).not.toBeInTheDocument();
});
it('uses the exact static H1 and accurately qualifies current product capabilities', () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    /^Free URL Shortener with QR Codes and Analytics$/,
  );
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByText(/pseudonymous analytics/)).toBeInTheDocument();
  expect(
    screen.getByText(/dashboard interface is not available/),
  ).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(
    /unlimited|enterprise-grade|100% anonymous|GDPR compliant|SOC 2|custom domains/i,
  );
  expect(screen.getByLabelText('Destination URL')).toBeRequired();
});
