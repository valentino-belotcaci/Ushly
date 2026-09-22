import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { PageContainer } from './PageContainer';
import { accountLinks, primaryLinks } from './navigation';
import { useSession } from '../api/session';
import { AccountActions } from '../features/auth/AccountActions';

export function Header() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const location = useLocation();
  const session = useSession();

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
          to="/"
          aria-label="Ushly home"
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
            {open ? 'Close menu' : 'Menu'}
          </Button>
        </div>
        <nav
          ref={navigation}
          id="primary-navigation"
          aria-label="Primary"
          className={`primary-navigation ${open ? 'is-open' : ''}`}
        >
          <ul className="primary-links">
            {primaryLinks.map((link) => (
              <li key={link.to}>
                <NavLink end to={link.to} onClick={closeMenu}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="account-links">
            {session.status === 'authenticated' ? (
              <AccountActions onAction={closeMenu} canLinkGoogle={session.googleLinkAvailable === true} />
            ) : (
              accountLinks.map((link, index) => (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={
                    location.pathname === link.to ? 'page' : undefined
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
