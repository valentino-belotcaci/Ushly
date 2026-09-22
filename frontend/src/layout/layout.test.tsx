import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { App } from '../app/App';
import { ThemeProvider } from '../theme/ThemeProvider';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal('scrollTo', vi.fn());
});
function renderApp(path = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
it('renders branded landmarks and all footer destinations', () => {
  renderApp();
  expect(
    within(screen.getByRole('banner')).getByRole('link', {
      name: 'Ushly home',
    }),
  ).toHaveAttribute('href', '/');
  const footer = within(screen.getByRole('contentinfo'));
  const expected = {
    Product: {
      'URL Shortener': '/url-shortener',
      'QR Codes': '/qr-codes',
      Analytics: '/analytics',
      Features: '/features',
    },
    Resources: {
      Contact: '/contact',
    },
    Legal: {
      'Privacy Policy': '/privacy',
      'Cookie Policy': '/cookies',
      'Terms of Service': '/terms',
    },
    Account: { 'Log in': '/login', 'Get started': '/register' },
  };
  for (const [group, links] of Object.entries(expected)) {
    const navigation = within(footer.getByRole('navigation', { name: group }));
    for (const [name, href] of Object.entries(links)) {
      expect(navigation.getByRole('link', { name })).toHaveAttribute(
        'href',
        href,
      );
    }
  }
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
});
it('supports disclosure activation, Escape restoration and public navigation', async () => {
  const user = userEvent.setup();
  renderApp();
  const toggle = screen.getByRole('button', { name: 'Menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveAttribute('aria-controls', 'primary-navigation');
  toggle.focus();
  await user.keyboard('{Enter}');
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const navigation = within(
    screen.getByRole('navigation', { name: 'Primary' }),
  );
  navigation.getByRole('link', { name: 'QR Codes' }).focus();
  await user.keyboard('{Escape}');
  expect(toggle).toHaveFocus();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await user.keyboard(' ');
  await user.click(navigation.getByRole('link', { name: 'QR Codes' }));
  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'QR codes for the short links you create',
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(
    within(screen.getByRole('navigation', { name: 'Primary' })).getByRole(
      'link',
      { name: 'QR Codes' },
    ),
  ).toHaveAttribute('aria-current', 'page');
});
it('switches theme by keyboard with an updated accessible label and dismissible tooltip', async () => {
  const user = userEvent.setup();
  renderApp();
  const toggle = screen.getByRole('button', { name: 'Use light theme' });
  toggle.focus();
  // User events flush the focus-triggered tooltip update.
  await user.keyboard('{Enter}');
  expect(toggle).toHaveAccessibleName('Use dark theme');
  expect(screen.getByRole('tooltip')).toHaveTextContent('Use dark theme');
  expect(localStorage.getItem('ushly.theme')).toBe('light');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(toggle).toHaveFocus();
});
it('renders login and registration forms while unknown destinations remain unavailable', () => {
  const first = renderApp('/login');
  expect(
    screen.getByRole('heading', { name: 'Log in to Ushly' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  first.unmount();
  const second = renderApp('/register');
  expect(
    screen.getByRole('heading', { name: 'Create an account' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  second.unmount();
  renderApp('/missing');
  expect(
    screen.getByRole('heading', { name: 'Page unavailable' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Return to Ushly' })).toHaveAttribute(
    'href',
    '/',
  );
});
