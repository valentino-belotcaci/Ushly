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
import { translations } from '../../i18n';

const navigation: {
  to: string;
  labelIndex: number;
  icon: DashboardIconName;
  end?: boolean;
}[] = [
  { to: '/dashboard', labelIndex: 0, icon: 'overview', end: true },
  { to: '/dashboard/links', labelIndex: 1, icon: 'links' },
  { to: '/dashboard/analytics', labelIndex: 2, icon: 'analytics' },
  { to: '/dashboard/qr-codes', labelIndex: 3, icon: 'qr' },
  { to: '/dashboard/settings', labelIndex: 4, icon: 'settings' },
];

export function DashboardGuard() {
  const session = useSession();
  const location = useLocation();
  const locale = useLocale();
  const text = translations(locale).dashboard;
  const localePrefix = /^\/(?:en|it)(?:\/|$)/.test(location.pathname);
  if (session.status === 'checking')
    return (
      <main className="dashboard-auth-state">
        <LoadingState label={text.restoring} />
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
  const copy = translations(locale);
  const text = copy.dashboard;
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
      notify(copy.layout.loggedOut, 'success', 3000);
      navigate(route('/login'), { replace: true });
    } catch {
      notify(
        copy.layout.logoutWarning,
        'warning',
      );
      navigate(route('/login'), { replace: true });
    }
  }

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#dashboard-content">
        {text.skip}
      </a>
      <header className="dashboard-mobile-header">
        <Link to={route('/dashboard')} aria-label={`Ushly ${text.label}`}>
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
            {open ? text.close : text.menu}
          </Button>
        </div>
      </header>
      {open && (
        <button
          className="dashboard-scrim"
          aria-label={text.closeMenu}
          onClick={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${open ? 'is-open' : ''}`}
        aria-label={text.label}
      >
        <Link
          className="dashboard-brand"
          to={route('/dashboard')}
          aria-label={`Ushly ${text.label}`}
          onClick={() => setOpen(false)}
        >
          <BrandLogo />
        </Link>
        <nav aria-label={text.navigation}>
          <ul>
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  {...(item.end ? { end: true } : {})}
                  to={route(item.to)}
                  onClick={() => setOpen(false)}
                >
                  <DashboardIcon name={item.icon} />
                  <span>{text.nav[item.labelIndex]}</span>
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
                  <span>{text.admin}</span>
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
              <strong>{text.account}</strong>
              <small>{session.user?.email ?? text.authenticatedUser}</small>
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
              {copy.layout.logout}
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
