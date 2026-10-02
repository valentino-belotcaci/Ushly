import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { PageContainer } from './PageContainer';
import { useSession } from '../api/session';
import { AccountActions } from '../features/auth/AccountActions';
import { LanguageSelector } from '../components/LanguageSelector';
import { translations } from '../i18n';
import { localizedPath, useLocale } from '../i18n/locale';

export function Header() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const location = useLocation();
  const session = useSession();
  const locale = useLocale();
  const t = translations(locale);
  const localePrefix = /^\/(?:en|it)(?:\/|$)/.test(location.pathname);
  const primaryPaths = ['/url-shortener', '/qr-codes', '/analytics', '/features'] as const;

  useEffect(() => {
    // Clear mobile disclosure state across breakpoint changes, including browser zoom.
    const desktop = window.matchMedia('(min-width: 64rem)');
    let lastFocused: EventTarget | null = document.activeElement;
    function rememberFocus(event: FocusEvent) {
      lastFocused = event.target;
    }
    function resetMenu() {
      // Browsers can clear activeElement before notifying us that CSS hid it.
      const focused =
        document.activeElement === document.body
          ? lastFocused
          : document.activeElement;
      if (
        !desktop.matches &&
        focused instanceof Node &&
        navigation.current?.contains(focused)
      ) {
        trigger.current?.focus();
      }
      if (desktop.matches && focused === trigger.current) {
        navigation.current?.querySelector('a')?.focus();
      }
      setOpen(false);
    }
    document.addEventListener('focusin', rememberFocus);
    desktop.addEventListener('change', resetMenu);
    return () => {
      document.removeEventListener('focusin', rememberFocus);
      desktop.removeEventListener('change', resetMenu);
    };
  }, []);

  function closeMenu() {
    if (open) trigger.current?.focus();
    setOpen(false);
  }

  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <PageContainer className="header-inner">
        <Link
          className="brand-link"
          to={localizedPath('/', locale, localePrefix)}
          aria-label={t.layout.home}
          onClick={closeMenu}
        >
          <BrandLogo />
        </Link>
        <div className="header-controls">
          <ThemeToggle />
          <Button
            ref={trigger}
            variant="secondary"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? t.layout.closeMenu : t.layout.menu}
          </Button>
        </div>
        <nav
          ref={navigation}
          id="primary-navigation"
          aria-label={t.layout.primary}
          className={`primary-navigation ${open ? 'is-open' : ''}`}
        >
          <ul className="primary-links">
            {primaryPaths.map((path, index) => (
              <li key={path}>
                <NavLink end to={localizedPath(path, locale, localePrefix)} onClick={closeMenu}>
                  {t.layout.nav[index]}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="account-links">
            <LanguageSelector />
            {session.status === 'authenticated' ? (
              <AccountActions onAction={closeMenu} canLinkGoogle={false} />
            ) : (
              [
                { label: t.layout.login, to: '/login' },
                { label: t.layout.getStarted, to: '/register' },
              ].map((link, index) => (
                <Link
                  key={link.to}
                  to={localizedPath(link.to, locale, localePrefix)}
                  aria-current={
                    location.pathname ===
                    localizedPath(link.to, locale, localePrefix)
                      ? 'page'
                      : undefined
                  }
                  onClick={closeMenu}
                  className={`button button--${index === 0 ? 'quiet' : 'primary'}`}
                >
                  {link.label}
                </Link>
              ))
            )}
          </div>
        </nav>
      </PageContainer>
    </header>
  );
}
