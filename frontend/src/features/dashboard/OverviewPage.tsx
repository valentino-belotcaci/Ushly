import { Link } from 'react-router';
import { Badge } from '../../components/Badge';
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from './DashboardState';
import { DashboardIcon } from './icons';
import { useOwnedLinks } from './useOwnedLinks';
import { publicShortUrl } from './api';

export function OverviewPage() {
  const { data, loading, error, reload } = useOwnedLinks(1, 5);
  if (loading) return <DashboardLoading />;
  if (error)
    return <DashboardError message={error} retry={() => void reload()} />;
  const links = data?.items ?? [];
  const active = links.filter((link) => link.status === 'active').length;
  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">Workspace</p>
          <h1>Overview</h1>
          <p>Manage your Ushly links, QR codes, and click insights.</p>
        </div>
        <Link className="button button--primary" to="/dashboard/links">
          Create a link
        </Link>
      </header>
      <section className="dashboard-metrics" aria-label="Link summary">
        <article className="card metric-card">
          <DashboardIcon name="links" />
          <div>
            <span>Total links</span>
            <strong>{data?.total ?? 0}</strong>
          </div>
        </article>
        <article className="card metric-card">
          <DashboardIcon name="power" />
          <div>
            <span>Active on this page</span>
            <strong>{active}</strong>
          </div>
        </article>
        <article className="card metric-card">
          <DashboardIcon name="qr" />
          <div>
            <span>QR ready</span>
            <strong>{links.length}</strong>
          </div>
        </article>
      </section>
      <section className="card dashboard-panel">
        <header>
          <div>
            <h2>Recent links</h2>
            <p>Your latest owned links.</p>
          </div>
          <Link to="/dashboard/links">View all</Link>
        </header>
        {links.length === 0 ? (
          <DashboardEmpty
            title="No links yet"
            text="Create your first shortened link to start building your workspace."
            action={
              <Link className="button button--primary" to="/dashboard/links">
                Create a link
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
                <Badge
                  tone={
                    link.status === 'active'
                      ? 'success'
                      : link.status === 'expired'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {link.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
