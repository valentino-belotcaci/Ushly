import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { ApiClientError } from '../../api/session';
import { getOwnedStatistics, type LinkStatistics } from './api';
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from './DashboardState';
import { useOwnedLinks } from './useOwnedLinks';

export function AnalyticsPage() {
  const links = useOwnedLinks(1, 100);
  const [selected, setSelected] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<LinkStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selectedId = selected || links.data?.items[0]?.id || '';
  useEffect(() => {
    if (!selectedId) return;
    let current = true;
    void getOwnedStatistics(selectedId)
      .then((value) => {
        if (current) setStats(value);
      })
      .catch((failure) => {
        if (current)
          setError(
            failure instanceof ApiClientError
              ? failure.message
              : 'Analytics could not be loaded.',
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [selectedId, refreshKey]);
  if (links.loading) return <DashboardLoading label="Loading analytics…" />;
  if (links.error)
    return (
      <DashboardError message={links.error} retry={() => void links.reload()} />
    );
  if (!links.data?.items.length)
    return (
      <div className="dashboard-page">
        <PageHeader />
        <DashboardEmpty
          title="No analytics yet"
          text="Create an owned link first. Click analytics will appear here after visits are recorded."
        />
      </div>
    );
  return (
    <div className="dashboard-page">
      <PageHeader />
      <div className="dashboard-filter">
        <label htmlFor="analytics-link">Link</label>
        <select
          id="analytics-link"
          className="input"
          value={selectedId}
          onChange={(e) => {
            setLoading(true);
            setError('');
            setStats(null);
            setSelected(e.target.value);
          }}
        >
          {links.data.items.map((link) => (
            <option key={link.id} value={link.id}>
              {link.title ?? link.shortCode}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={() => {
            setLoading(true);
            setError('');
            setRefreshKey((value) => value + 1);
          }}
        >
          Refresh
        </Button>
      </div>
      {loading ? (
        <DashboardLoading label="Loading click analytics…" />
      ) : error ? (
        <DashboardError message={error} />
      ) : (
        stats && (
          <>
            <section
              className="dashboard-metrics"
              aria-label="Analytics summary"
            >
              <article className="card metric-card">
                <div>
                  <span>Total clicks</span>
                  <strong>{stats.total}</strong>
                </div>
              </article>
              <article className="card metric-card">
                <div>
                  <span>First click</span>
                  <strong className="metric-date">
                    {stats.firstClickedAt
                      ? new Date(stats.firstClickedAt).toLocaleDateString()
                      : '—'}
                  </strong>
                </div>
              </article>
              <article className="card metric-card">
                <div>
                  <span>Last click</span>
                  <strong className="metric-date">
                    {stats.lastClickedAt
                      ? new Date(stats.lastClickedAt).toLocaleDateString()
                      : '—'}
                  </strong>
                </div>
              </article>
            </section>
            <section className="dashboard-analytics-grid">
              <article className="card dashboard-panel">
                <header>
                  <div>
                    <h2>Clicks over time</h2>
                    <p>Last 30 days · UTC</p>
                  </div>
                </header>
                {stats.timeSeries.length ? (
                  <ul className="analytics-bars">
                    {stats.timeSeries.map((point) => (
                      <li key={point.bucket}>
                        <span>
                          {new Date(point.bucket).toLocaleDateString(
                            undefined,
                            { month: 'short', day: 'numeric' },
                          )}
                        </span>
                        <div>
                          <i
                            style={{
                              width: `${Math.max(4, stats.total ? (point.clicks / stats.total) * 100 : 0)}%`,
                            }}
                          />
                        </div>
                        <strong>{point.clicks}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <DashboardEmpty
                    title="No clicks in this period"
                    text="Visits will appear here after the short URL is opened."
                  />
                )}
              </article>
              <article className="card dashboard-panel">
                <header>
                  <div>
                    <h2>Top referrers</h2>
                    <p>Privacy-conscious source domains.</p>
                  </div>
                </header>
                {stats.breakdowns.referrers.length ? (
                  <ol className="breakdown-list">
                    {stats.breakdowns.referrers.map((row) => (
                      <li key={row.value}>
                        <span>{row.value || 'Direct'}</span>
                        <strong>{row.clicks}</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="dashboard-panel-empty">No referrer data yet.</p>
                )}
              </article>
            </section>
          </>
        )
      )}
    </div>
  );
}
function PageHeader() {
  return (
    <header className="dashboard-page-header">
      <div>
        <p className="dashboard-eyebrow">Insights</p>
        <h1>Analytics</h1>
        <p>Review click activity for one owned link at a time.</p>
      </div>
    </header>
  );
}
