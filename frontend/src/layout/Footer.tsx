import { Link } from 'react-router';
import { BrandLogo } from '../components/BrandLogo';
import { PageContainer } from './PageContainer';
import { footerGroups } from './navigation';

export function Footer() {
  return (
    <footer className="site-footer">
      <PageContainer>
        <div className="footer-groups">
          {footerGroups.map((group) => (
            <nav key={group.label} aria-label={group.label}>
              <h2>{group.label}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="footer-brand">
          <div className="footer-brand__identity">
            <Link className="brand-link" to="/" aria-label="Ushly home">
              <BrandLogo />
            </Link>
            <p className="muted">
              Short links, QR codes, and owner-only analytics.
            </p>
          </div>
          <span className="muted">© 2026 Ushly. All rights reserved.</span>
        </div>
      </PageContainer>
    </footer>
  );
}
