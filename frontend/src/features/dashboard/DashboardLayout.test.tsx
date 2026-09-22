import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiSession } from '../../api/session';
import { ToastProvider } from '../../components/ToastProvider';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { DashboardGuard } from './DashboardLayout';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

function renderDashboard() {
  render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={['/dashboard/links']}>
          <Routes>
            <Route path="/login" element={<h1>Login page</h1>} />
            <Route path="/dashboard" element={<DashboardGuard />}>
              <Route path="links" element={<h1>Owned links</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>,
  );
}

it('redirects an anonymous dashboard visitor to login', async () => {
  vi.spyOn(apiSession, 'getSnapshot').mockReturnValue({
    status: 'anonymous',
    user: null,
  });
  renderDashboard();
  expect(
    await screen.findByRole('heading', { name: 'Login page' }),
  ).toBeVisible();
});

it('renders the private sidebar and nested view for an authenticated user', () => {
  vi.spyOn(apiSession, 'getSnapshot').mockReturnValue({
    status: 'authenticated',
    user: {
      id: 'user-1',
      email: 'reader@example.test',
      createdAt: '2026-09-22T10:00:00.000Z',
    },
    googleLinkAvailable: true,
  });
  renderDashboard();
  expect(
    screen.getByRole('navigation', { name: 'Dashboard navigation' }),
  ).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Owned links' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Log out' })).toBeVisible();
});
