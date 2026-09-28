import { Link, useLocation } from 'react-router';
import { BrandLogo } from '../components/BrandLogo';
import { PageContainer } from './PageContainer';
import { translations } from '../i18n';
import { localizedPath, useLocale } from '../i18n/locale';

export function Footer() {
  const locale = useLocale();
  const localePrefix = /^\/(?:en|it)(?:\/|$)/.test(useLocation().pathname);
  const t = translations(locale);
  const productPaths = ['/url-shortener', '/qr-codes', '/analytics', '/features'] as const;
  const groups = [
    { label: t.layout.product, links: productPaths.map((to, index) => ({ label: t.layout.nav[index], to: localizedPath(to, locale, localePrefix) })) },
    { label: t.layout.resources, links: [{ label: t.layout.contact, to: localizedPath('/contact', locale, localePrefix) }] },
    { label: t.layout.legal, links: [
      { label: t.layout.privacy, to: localePrefix ? localizedPath('/privacy-policy', locale) : '/privacy' },
      { label: t.layout.cookies, to: localePrefix ? localizedPath('/cookie-policy', locale) : '/cookies' },
      { label: t.layout.terms, to: localePrefix ? localizedPath('/terms-of-service', locale) : '/terms' },
    ] },
    { label: t.layout.account, links: [{ label: t.layout.login, to: localizedPath('/login', locale, localePrefix) }, { label: t.layout.getStarted, to: localizedPath('/register', locale, localePrefix) }] },
  ];
  return (
    <footer className="site-footer">
      <PageContainer>
        <div className="footer-groups">
          {groups.map((group) => (
            <nav key={group.label} aria-label={group.label}>
              <h2>{group.label}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
                {group === groups[2] && (
                  <li>
                    <button
                      className="footer-cookie-settings"
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new Event('ushly:open-cookie-settings'),
                        )
                      }
                    >
                      {t.layout.cookieSettings}
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          ))}
        </div>
        <div className="footer-brand">
          <div className="footer-brand__identity">
            <Link className="brand-link" to={localizedPath('/', locale, localePrefix)} aria-label={t.layout.home}>
              <BrandLogo />
            </Link>
            <p className="muted">
              {t.layout.footerDescription}
            </p>
          </div>
          <span className="muted">{t.layout.copyright}</span>
        </div>
      </PageContainer>
    </footer>
  );
}
