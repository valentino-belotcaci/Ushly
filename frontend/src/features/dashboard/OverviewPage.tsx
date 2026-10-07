import { Link } from 'react-router';
import { Badge } from '../../components/Badge';
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from './DashboardState';
import { DashboardIcon } from './icons';
import { useOwnedLinks } from './useOwnedLinks';
import { publicShortUrl, type OwnedLink } from './api';
import { translations } from '../../i18n';
import { useLocale, useLocalizedRoute } from '../../i18n/locale';
import { displayedLinkStatus } from './linkStatus';

function OverviewLinkStatusBadge({ link }: { link: OwnedLink }) {
  const common = translations(useLocale()).common;
  const status = displayedLinkStatus(link);
  return (
    <Badge
      tone={
        status === 'active'
          ? 'success'
          : status === 'expired'
            ? 'warning'
            : 'neutral'
      }
    >
      {status === 'active'
        ? common.active
        : status === 'expired'
          ? common.expired
          : common.disabled}
    </Badge>
  );
}

export function OverviewPage() {
  const copy = translations(useLocale());
  const t = copy.dashboard;
  const route = useLocalizedRoute();
  const { data, loading, error, reload } = useOwnedLinks(1, 5);
  if (loading) return <DashboardLoading variant="overview" />;
  if (error)
    return <DashboardError message={error} retry={() => void reload()} />;
  const links = data?.items ?? [];
  const active = links.filter(
    (link) => displayedLinkStatus(link) === 'active',
  ).length;
  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">{t.workspace}</p>
          <h1>{t.overview}</h1>
          <p>{t.overviewLead}</p>
        </div>
        <Link className="button button--primary" to={route('/dashboard/links')}>
          {t.createLink}
        </Link>
      </header>
      <section className="dashboard-metrics" aria-label={t.linkSummary}>
        <article className="card metric-card">
          <DashboardIcon name="links" />
          <div>
            <span>{t.totalLinks}</span>
            <strong>{data?.total ?? 0}</strong>
          </div>
        </article>
        <article className="card metric-card">
          <DashboardIcon name="power" />
          <div>
            <span>{t.activePage}</span>
            <strong>{active}</strong>
          </div>
        </article>
        <article className="card metric-card">
          <DashboardIcon name="qr" />
          <div>
            <span>{t.qrReady}</span>
            <strong>{links.length}</strong>
          </div>
        </article>
      </section>
      <section className="card dashboard-panel">
        <header>
          <div>
            <h2>{t.recentLinks}</h2>
            <p>{t.latestLinks}</p>
          </div>
          <Link to={route('/dashboard/links')}>{t.viewAll}</Link>
        </header>
        {links.length === 0 ? (
          <DashboardEmpty
            title={t.noLinks}
            text={t.noLinksText}
            action={
              <Link className="button button--primary" to={route('/dashboard/links')}>
                {t.createLink}
              </Link>
            }
          />
        ) : (
          <ul className="recent-links">
            {links.map((link) => (
              <li key={link.id}>
                <div>
                  <strong>{link.title ?? link.shortCode}</strong>
                  <a
                    href={publicShortUrl(link.shortCode)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /{link.shortCode}
                  </a>
                  <small>{link.destinationUrl}</small>
                </div>
                <OverviewLinkStatusBadge link={link} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
