import { useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router';
import { apiSession, useSession } from '../../api/session';
import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useToast } from '../../components/toast-context';
import { DashboardIcon, type DashboardIconName } from './icons';
import { checkAdminAccess } from '../admin/api';
import './dashboard.css';
import { localizedPath, useLocale } from '../../i18n/locale';

const navigation: {
  to: string;
  label: string;
  icon: DashboardIconName;
  end?: boolean;
}[] = [
  { to: '/dashboard', label: 'Overview', icon: 'overview', end: true },
  { to: '/dashboard/links', label: 'Links', icon: 'links' },
  { to: '/dashboard/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/dashboard/qr-codes', label: 'QR Codes', icon: 'qr' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'settings' },
];

export function DashboardGuard() {
  const session = useSession();
  const location = useLocation();
  const locale = useLocale();
  const localePrefix = /^\/(?:en|it)(?:\/|$)/.test(location.pathname);
  if (session.status === 'checking')
    return (
      <main className="dashboard-auth-state">
        <LoadingState label="Restoring your session…" />
      </main>
    );
  if (session.status === 'anonymous')
    return (
      <Navigate
        to={localizedPath('/login', locale, localePrefix)}
        replace
        state={{ from: location.pathname }}
      />
    );
  return <DashboardLayout />;
}

function DashboardLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const notify = useToast();
  const locale = useLocale();
  const location = useLocation();
  const localePrefix = /^\/(?:en|it)(?:\/|$)/.test(location.pathname);
  const route = (path: string) => localizedPath(path, locale, localePrefix);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminAccess, setAdminAccess] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  useEffect(() => {
    let active = true;
    void checkAdminAccess()
      .then(() => {
        if (active) setAdminAccess(true);
      })
      .catch(() => {
        if (active) setAdminAccess(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiSession.logout();
      notify('You have logged out.', 'success', 3000);
      navigate(route('/login'), { replace: true });
    } catch {
      notify(
        'You are signed out here, but the server could not confirm logout. Please try again when connected.',
        'warning',
      );
      navigate(route('/login'), { replace: true });
    }
  }

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#dashboard-content">
        Skip to dashboard content
      </a>
      <header className="dashboard-mobile-header">
        <Link to={route('/dashboard')} aria-label="Ushly dashboard">
          <BrandLogo />
        </Link>
        <div className="row">
          <ThemeToggle />
          <Button
            ref={trigger}
            variant="secondary"
            aria-expanded={open}
            aria-controls="dashboard-sidebar"
            onClick={() => setOpen(!open)}
          >
            <DashboardIcon name={open ? 'close' : 'menu'} />
            {open ? 'Close' : 'Menu'}
          </Button>
        </div>
      </header>
      {open && (
        <button
          className="dashboard-scrim"
          aria-label="Close dashboard menu"
          onClick={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${open ? 'is-open' : ''}`}
        aria-label="Dashboard"
      >
        <Link
          className="dashboard-brand"
          to={route('/dashboard')}
          aria-label="Ushly dashboard"
          onClick={() => setOpen(false)}
        >
          <BrandLogo />
        </Link>
        <nav aria-label="Dashboard navigation">
          <ul>
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  {...(item.end ? { end: true } : {})}
                  to={route(item.to)}
                  onClick={() => setOpen(false)}
                >
                  <DashboardIcon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
            {adminAccess && (
              <li>
                <NavLink
                  to={route('/dashboard/admin')}
                  onClick={() => setOpen(false)}
                >
                  <DashboardIcon name="settings" />
                  <span>Admin</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
        <div className="dashboard-language">
          <LanguageSelector />
        </div>
        <div className="dashboard-account">
          <div>
            <span className="dashboard-avatar" aria-hidden="true">
              {session.user?.email.slice(0, 1).toUpperCase() ?? 'U'}
            </span>
            <span className="dashboard-account-copy">
              <strong>Account</strong>
              <small>{session.user?.email ?? 'Authenticated user'}</small>
            </span>
          </div>
          <div className="dashboard-account-actions">
            <ThemeToggle />
            <Button
              variant="quiet"
              loading={loggingOut}
              onClick={() => void logout()}
            >
              <DashboardIcon name="power" />
              Log out
            </Button>
          </div>
        </div>
      </aside>
      <main id="dashboard-content" className="dashboard-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
