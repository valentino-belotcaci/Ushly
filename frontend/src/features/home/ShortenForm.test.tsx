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
import { generatePublicQr } from './qr';
vi.mock('./qr', () => ({ generatePublicQr: vi.fn() }));
const qrMock = vi.mocked(generatePublicQr);
const qrBlob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], {
  type: 'image/svg+xml',
});

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
  qrMock.mockReset().mockResolvedValue(qrBlob);
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
  await user.click(screen.getByRole('button', { name: 'Shorten link' }));
}
it.each(['', 'not-a-url', 'javascript:alert(1)', 'ftp://example.com/file'])(
  'rejects invalid destination %s without making a request',
  async (url) => {
    const { user } = setup();
    if (url) await user.type(screen.getByLabelText('Destination URL'), url);
    await user.click(screen.getByRole('button', { name: 'Shorten link' }));
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
    screen.getByText('Your shortened URL will appear below.'),
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
  expect(
    await screen.findByText('https://api.example/aB3x7Qz'),
  ).toBeInTheDocument();
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
  await user.click(screen.getByRole('button', { name: 'Copy' }));
  expect(clipboard).toHaveBeenCalledWith('https://api.example/aB3x7Qz');
  expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'QR' })).toBeEnabled();
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
    expect(screen.getByRole('button', { name: 'Shorten link' })).toBeEnabled();
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
  await user.click(screen.getByRole('button', { name: 'Shorten link' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'invalid response',
  );
  expect(
    screen.queryByText('https://api.example/aB3x7Qz'),
  ).not.toBeInTheDocument();
});
it('provides a manual-copy fallback', async () => {
  const { user } = setup();
  fetchMock.mockResolvedValueOnce(linkResponse());
  await submit(user);
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
    new Error('denied'),
  );
  await user.click(screen.getByRole('button', { name: 'Copy' }));
  expect(
    screen.getByRole('button', { name: 'Copy unavailable' }),
  ).toBeInTheDocument();
  expect(screen.getByText('https://api.example/aB3x7Qz')).toBeInTheDocument();
});
it('shows only the available result actions', async () => {
  const { user } = setup();
  fetchMock.mockResolvedValueOnce(linkResponse());
  await submit(user);
  expect(screen.getByRole('link', { name: 'Visit URL' })).toHaveAttribute(
    'href',
    'https://api.example/aB3x7Qz',
  );
  expect(screen.getByRole('button', { name: 'QR' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
  expect(
    screen.queryByRole('button', { name: 'Share' }),
  ).not.toBeInTheDocument();
});
it('generates an anonymous QR once, downloads it and revokes the object URL', async () => {
  const { user, unmount } = setup();
  fetchMock.mockResolvedValueOnce(linkResponse());
  await submit(user);
  let finish: (blob: Blob) => void = () => {};
  qrMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const button = screen.getByRole('button', { name: 'QR' });
  fireEvent.click(button);
  expect(qrMock).toHaveBeenCalledExactlyOnceWith('https://api.example/aB3x7Qz');
  expect(
    screen.getByRole('dialog', { name: 'Download your QR code' }),
  ).toBeInTheDocument();
  await act(async () => finish(qrBlob));
  const download = await screen.findByRole('link', {
    name: 'Download QR code (SVG)',
  });
  expect(download).toHaveAttribute('download', 'ushly-aB3x7Qz.svg');
  expect(download).toHaveAttribute('href', 'blob:qr-fixture');
  // Prevent jsdom navigation while preserving React's download status handler.
  download.addEventListener('click', (event) => event.preventDefault());
  fireEvent.click(download);
  expect(screen.getByText(/QR download requested/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Close QR code' }));
  await user.click(screen.getByRole('button', { name: 'QR' }));
  expect(qrMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(
    'blob:qr-fixture',
  );
});
it('reports safe generation failures and retries without network requests', async () => {
  const { user } = setup('test-access-token');
  fetchMock.mockResolvedValueOnce(linkResponse());
  await submit(user);
  qrMock.mockRejectedValueOnce(new Error('private-destination-secret'));
  await user.click(screen.getByRole('button', { name: 'QR' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not generate',
  );
  expect(document.body).not.toHaveTextContent('private-destination-secret');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByRole('img', { name: 'QR code for your shortened URL' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(qrMock.mock.calls).toEqual([
    ['https://api.example/aB3x7Qz'],
    ['https://api.example/aB3x7Qz'],
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('revokes an old preview when shortening again', async () => {
  const { user } = setup();
  fetchMock.mockImplementation(async () => linkResponse());
  await submit(user);
  await user.click(screen.getByRole('button', { name: 'QR' }));
  await screen.findByRole('img');
  await user.click(screen.getByRole('button', { name: 'Close QR code' }));
  await user.click(screen.getByRole('button', { name: 'Shorten link' }));
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(
    'blob:qr-fixture',
  );
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it.each(['unmount', 'replacement'])(
  'discards generation that finishes after %s without allocating a Blob URL',
  async (action) => {
    const { user, unmount } = setup();
    fetchMock.mockImplementation(async () => linkResponse());
    await submit(user);
    let finish: (blob: Blob) => void = () => {};
    qrMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await user.click(screen.getByRole('button', { name: 'QR' }));
    if (action === 'unmount') unmount();
    else {
      await user.click(screen.getByRole('button', { name: 'Close QR code' }));
      await user.click(screen.getByRole('button', { name: 'Shorten link' }));
    }
    await act(async () => finish(qrBlob));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    if (action === 'replacement') {
      await user.click(screen.getByRole('button', { name: 'QR' }));
      await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    }
  },
);
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
  expect(
    screen.getAllByRole('link', { name: 'Create free account' })[0],
  ).toHaveAttribute('href', '/register');
  expect(screen.getAllByRole('form')).toHaveLength(1);
});
