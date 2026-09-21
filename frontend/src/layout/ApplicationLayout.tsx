import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { Footer } from './Footer';
import './layout.css';

export function ApplicationLayout() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    // Client-side navigation needs a predictable reading/focus starting point.
    if (previousPath.current !== location.pathname) {
      main.current?.focus();
      window.scrollTo(0, 0);
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  return (
    <div className="application-layout">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {/* A new destination resets the disclosure, including browser back/forward. */}
      <Header key={location.pathname} />
      <main id="main-content" ref={main} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
