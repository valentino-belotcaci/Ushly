import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../api/session';
import { Button } from '../../components/Button';
import { getOwnedStatistics, type LinkStatistics } from './api';
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from './DashboardState';
import { useOwnedLinks } from './useOwnedLinks';

const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_VISIBLE_BUCKETS = 240;
type Range = {
  from: string;
  to: string;
  granularity: LinkStatistics['granularity'];
};

function utcInput(date: Date) {
  return date.toISOString().slice(0, 16);
}
function initialRange(): Range {
  const to = new Date();
  return {
    from: utcInput(new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)),
    to: utcInput(to),
    granularity: 'day',
  };
}
function inputToIso(value: string) {
  return new Date(`${value}:00.000Z`).toISOString();
}
function formatUtc(value: string | null, includeTime = true) {
  if (!value) return 'No clicks';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
    timeZone: 'UTC',
  }).format(new Date(value));
}
export function AnalyticsPage() {
  const links = useOwnedLinks(1, 100);
  const [selected, setSelected] = useState('');
  const [draft, setDraft] = useState<Range>(initialRange);
  const [range, setRange] = useState<Range>(initialRange);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<LinkStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rangeError, setRangeError] = useState('');
  const selectedId = selected || links.data?.items[0]?.id || '';

  useEffect(() => {
    if (!selectedId) return;
    let current = true;
    const pending = Promise.resolve().then(() => {
      if (current) {
        setLoading(true);
        setError('');
      }
      return getOwnedStatistics(selectedId, {
        from: inputToIso(range.from),
        to: inputToIso(range.to),
        granularity: range.granularity,
      });
    });
    void pending
      .then((value) => {
        if (current) setStats(value);
      })
      .catch((failure) => {
        if (!current) return;
        setStats(null);
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
  }, [range, refreshKey, selectedId]);

  function applyRange(event: FormEvent) {
    event.preventDefault();
    const from = new Date(`${draft.from}:00.000Z`);
    const to = new Date(`${draft.to}:00.000Z`);
    if (
      !draft.from ||
      !draft.to ||
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from >= to
    ) {
      setRangeError('Choose a UTC start time earlier than the end time.');
      return;
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
      setRangeError('The statistics range cannot exceed 90 days.');
      return;
    }
    setRangeError('');
    setRange(draft);
  }

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
    <div className="dashboard-page dashboard-analytics-page">
      <PageHeader />
      <form className="card analytics-controls" onSubmit={applyRange}>
        <label>
          Link
          <select
            className="input"
            value={selectedId}
            onChange={(event) => setSelected(event.target.value)}
          >
            {links.data.items.map((link) => (
              <option key={link.id} value={link.id}>
                {link.title ?? link.shortCode}
              </option>
            ))}
          </select>
        </label>
        <label>
          From (UTC)
          <input
            className="input"
            type="datetime-local"
            value={draft.from}
            onChange={(event) =>
              setDraft({ ...draft, from: event.target.value })
            }
          />
        </label>
        <label>
          To (UTC)
          <input
            className="input"
            type="datetime-local"
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
        <label>
          Granularity
          <select
            className="input"
            value={draft.granularity}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'hour' || value === 'day' || value === 'week')
                setDraft({ ...draft, granularity: value });
            }}
          >
            <option value="hour">Hour</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
        </label>
        <div className="analytics-controls__actions">
          <Button type="submit">Apply range</Button>
          <Button
            variant="secondary"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Refresh
          </Button>
        </div>
        {rangeError && (
          <p className="dashboard-inline-error" role="alert">
            {rangeError}
          </p>
        )}
        {links.data.total > links.data.items.length && (
          <p className="analytics-data-note" role="status">
            Showing the newest {links.data.items.length} of {links.data.total}{' '}
            links. Use Links to manage the full dataset.
          </p>
        )}
      </form>
      {loading ? (
        <DashboardLoading label="Loading click analytics…" />
      ) : error ? (
        <DashboardError
          message={error}
          retry={() => setRefreshKey((value) => value + 1)}
        />
      ) : stats ? (
        <AnalyticsResults stats={stats} />
      ) : null}
    </div>
  );
}

function AnalyticsResults({ stats }: { stats: LinkStatistics }) {
  const visibleSeries = stats.timeSeries.slice(0, MAX_VISIBLE_BUCKETS);
  const maximum = useMemo(
    () => Math.max(1, ...visibleSeries.map((point) => point.clicks)),
    [visibleSeries],
  );
  return (
    <>
      <p className="analytics-timezone" role="note">
        All statistics use UTC. Range: {formatUtc(stats.from)} to{' '}
        {formatUtc(stats.to)}.
      </p>
      <section className="dashboard-metrics" aria-label="Analytics summary">
        <article className="card metric-card">
          <div>
            <span>Total clicks</span>
            <strong>{stats.total.toLocaleString()}</strong>
          </div>
        </article>
        <article className="card metric-card">
          <div>
            <span>First click · UTC</span>
            <strong className="metric-date">
              {formatUtc(stats.firstClickedAt)}
            </strong>
          </div>
        </article>
        <article className="card metric-card">
          <div>
            <span>Last click · UTC</span>
            <strong className="metric-date">
              {formatUtc(stats.lastClickedAt)}
            </strong>
          </div>
        </article>
      </section>
      <section
        className="card dashboard-panel analytics-section"
        aria-labelledby="time-series-title"
      >
        <header>
          <div>
            <h2 id="time-series-title">Clicks over time</h2>
            <p>{stats.granularity} buckets · UTC</p>
          </div>
        </header>
        {visibleSeries.length ? (
          <>
            {stats.timeSeries.length > MAX_VISIBLE_BUCKETS && (
              <p className="analytics-data-note" role="status">
                Large dataset: showing the first {MAX_VISIBLE_BUCKETS} of{' '}
                {stats.timeSeries.length} buckets. Choose day or week for a
                complete compact view.
              </p>
            )}
            <ul className="analytics-bars">
              {visibleSeries.map((point) => (
                <li key={point.bucket}>
                  <span title={formatUtc(point.bucket)}>
                    {formatUtc(point.bucket, stats.granularity === 'hour')}
                  </span>
                  <div aria-hidden="true">
                    <i
                      style={{
                        width: `${Math.max(2, (point.clicks / maximum) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong aria-label={`${point.clicks} clicks`}>
                    {point.clicks}
                  </strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <DashboardEmpty
            title="No clicks in this period"
            text="Visits will appear here after the short URL is opened."
          />
        )}
      </section>
      <div className="dashboard-analytics-grid">
        <Breakdown
          title="Referrers"
          description="Top recorded referrer origins."
          rows={stats.breakdowns.referrers}
          empty="No referrer data in this period."
        />
        <Breakdown
          title="User agents"
          description="Top recorded browser user-agent values."
          rows={stats.breakdowns.userAgents}
          empty="No user-agent data in this period."
        />
      </div>
    </>
  );
}

function Breakdown({
  title,
  description,
  rows,
  empty,
}: {
  title: string;
  description: string;
  rows: { value: string; clicks: number }[];
  empty: string;
}) {
  const id = `breakdown-${title.replace(' ', '-').toLowerCase()}`;
  return (
    <section
      className="card dashboard-panel analytics-section"
      aria-labelledby={id}
    >
      <header>
        <div>
          <h2 id={id}>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {rows.length ? (
        <ol className="breakdown-list">
          {rows.map((row) => (
            <li key={row.value}>
              <span title={row.value}>{row.value || 'Direct'}</span>
              <strong>{row.clicks}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="dashboard-panel-empty">{empty}</p>
      )}
    </section>
  );
}

function PageHeader() {
  return (
    <header className="dashboard-page-header">
      <div>
        <p className="dashboard-eyebrow">Insights</p>
        <h1>Analytics</h1>
        <p>Review owner-only click activity for one link at a time.</p>
      </div>
    </header>
  );
}
