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
          <Link className="brand-link" to="/" aria-label="Ushly home">
            <BrandLogo />
          </Link>
          <span className="muted">© {new Date().getFullYear()} Ushly</span>
        </div>
      </PageContainer>
    </footer>
  );
}
