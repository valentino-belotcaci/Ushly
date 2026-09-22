import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiSession, ApiClientError } from '../../api/session';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AuthPage } from './AuthPage';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.restoreAllMocks();
});

function renderPage(mode: 'login' | 'register') {
  render(
    <ThemeProvider>
      <MemoryRouter>
        <AuthPage mode={mode} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

it('validates confirmation locally and registers with only email and password', async () => {
  const user = userEvent.setup();
  const register = vi.spyOn(apiSession, 'register').mockResolvedValue({
    id: 'user-1',
    email: 'reader@example.test',
    createdAt: '2026-09-22T10:00:00.000Z',
  });
  renderPage('register');
  expect(
    screen.getByRole('heading', { name: 'Create an account' }),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy',
  );
  expect(
    screen.getByRole('link', { name: 'Terms of Service' }),
  ).toHaveAttribute('href', '/terms');
  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'reader@example.test',
  );
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'safe-password',
  );
  await user.type(screen.getByLabelText('Confirm password'), 'different');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByText('Passwords do not match.')).toBeVisible();
  expect(register).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Confirm password'));
  await user.type(screen.getByLabelText('Confirm password'), 'safe-password');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(register).toHaveBeenCalledWith({
    email: 'reader@example.test',
    password: 'safe-password',
  });
  expect(await screen.findByText('Account created.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
    'href',
    '/login',
  );
});

it('prevents duplicate registration while the request is pending', async () => {
  const user = userEvent.setup();
  let finish: (value: {
    id: string;
    email: string;
    createdAt: string;
  }) => void = () => {};
  const register = vi.spyOn(apiSession, 'register').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  renderPage('register');
  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'reader@example.test',
  );
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'safe-password',
  );
  await user.type(screen.getByLabelText('Confirm password'), 'safe-password');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  expect(register).toHaveBeenCalledTimes(1);
  finish({
    id: 'user-1',
    email: 'reader@example.test',
    createdAt: '2026-09-22T10:00:00.000Z',
  });
  expect(await screen.findByText('Account created.')).toBeVisible();
});

it('shows safe authentication and account-linking guidance on login', async () => {
  const user = userEvent.setup();
  const login = vi
    .spyOn(apiSession, 'login')
    .mockRejectedValue(
      new ApiClientError(
        'http',
        401,
        'invalid_credentials',
        'Invalid email or password.',
      ),
    );
  renderPage('login');
  expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'reader@example.test',
  );
  await user.type(screen.getByLabelText('Password'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Invalid email or password.',
  );
  login.mockRejectedValueOnce(
    new ApiClientError('http', 409, 'oauth_conflict', 'safe'),
  );
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'verify your password',
  );
  expect(
    screen.getByRole('link', { name: 'Create an account' }),
  ).toHaveAttribute('href', '/register');
});
