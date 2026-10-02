import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../api/session';
import { Button } from '../../components/Button';
import { formatDateTime, formatFullDateTime } from '../../utils/dateTime';
import { getOwnedStatistics, type LinkStatistics } from './api';
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from './DashboardState';
import { useOwnedLinks } from './useOwnedLinks';
import { translations, type Translation } from '../../i18n';
import { useLocale } from '../../i18n/locale';

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
function formatUtc(value: string | null, fallback: string, includeTime = true) {
  return formatDateTime(value, {
    fallback,
    includeTime,
    timeZone: 'UTC',
  });
}
export function AnalyticsPage() {
  const copy = translations(useLocale());
  const t = copy.dashboard.analytics;
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
            : t.loadError,
        );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [range, refreshKey, selectedId, t.loadError]);

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
      setRangeError(t.invalidRange);
      return;
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
      setRangeError(t.rangeLong);
      return;
    }
    setRangeError('');
    setRange(draft);
  }

  if (links.loading)
    return <DashboardLoading label={t.loading} variant="analytics" />;
  if (links.error)
    return (
      <DashboardError message={links.error} retry={() => void links.reload()} />
    );
  if (!links.data?.items.length)
    return (
      <div className="dashboard-page">
        <PageHeader text={t} />
        <DashboardEmpty
          title={t.empty}
          text={t.emptyText}
        />
      </div>
    );

  return (
    <div className="dashboard-page dashboard-analytics-page">
      <PageHeader text={t} />
      <form className="card analytics-controls" onSubmit={applyRange}>
        <label>
          {t.link}
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
          {t.from}
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
          {t.to}
          <input
            className="input"
            type="datetime-local"
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
        <label>
          {t.granularity}
          <select
            className="input"
            value={draft.granularity}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'hour' || value === 'day' || value === 'week')
                setDraft({ ...draft, granularity: value });
            }}
          >
            <option value="hour">{t.hour}</option>
            <option value="day">{t.day}</option>
            <option value="week">{t.week}</option>
          </select>
        </label>
        <div className="analytics-controls__actions">
          <Button type="submit">{t.apply}</Button>
          <Button
            variant="secondary"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            {t.refresh}
          </Button>
        </div>
        {rangeError && (
          <p className="dashboard-inline-error" role="alert">
            {rangeError}
          </p>
        )}
        {links.data.total > links.data.items.length && (
          <p className="analytics-data-note" role="status">
            {t.newestPrefix} {links.data.items.length} {t.newestMiddle}{' '}
            {links.data.total} {t.newestSuffix}
          </p>
        )}
      </form>
      {loading ? (
        <DashboardLoading
          label={t.loadingClicks}
          variant="analytics"
        />
      ) : error ? (
        <DashboardError
          message={error}
          retry={() => setRefreshKey((value) => value + 1)}
        />
      ) : stats ? (
        <AnalyticsResults stats={stats} text={t} />
      ) : null}
    </div>
  );
}

function AnalyticsResults({ stats, text: t }: { stats: LinkStatistics; text: Translation['dashboard']['analytics'] }) {
  const visibleSeries = stats.timeSeries.slice(0, MAX_VISIBLE_BUCKETS);
  const maximum = useMemo(
    () => Math.max(1, ...visibleSeries.map((point) => point.clicks)),
    [visibleSeries],
  );
  return (
    <>
      <p className="analytics-timezone" role="note">
        {t.allUtc} {formatUtc(stats.from, t.noPeriod)} {t.rangeTo}{' '}
        {formatUtc(stats.to, t.noPeriod)}.
      </p>
      <section className="dashboard-metrics" aria-label={t.summary}>
        <article className="card metric-card">
          <div>
            <span>{t.total}</span>
            <strong>{stats.total.toLocaleString()}</strong>
          </div>
        </article>
        <article className="card metric-card">
          <div>
            <span>{t.first}</span>
            <strong
              className="metric-date"
              title={
                stats.firstClickedAt
                  ? formatFullDateTime(stats.firstClickedAt, 'UTC')
                  : undefined
              }
            >
              {formatUtc(stats.firstClickedAt, t.noPeriod)}
            </strong>
          </div>
        </article>
        <article className="card metric-card">
          <div>
            <span>{t.last}</span>
            <strong
              className="metric-date"
              title={
                stats.lastClickedAt
                  ? formatFullDateTime(stats.lastClickedAt, 'UTC')
                  : undefined
              }
            >
              {formatUtc(stats.lastClickedAt, t.noPeriod)}
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
            <h2 id="time-series-title">{t.series}</h2>
            <p>
              {stats.granularity === 'hour'
                ? t.hour
                : stats.granularity === 'week'
                  ? t.week
                  : t.day}{' '}
              {t.buckets}
            </p>
          </div>
        </header>
        {visibleSeries.length ? (
          <>
            {stats.timeSeries.length > MAX_VISIBLE_BUCKETS && (
              <p className="analytics-data-note" role="status">
                {t.largePrefix} {MAX_VISIBLE_BUCKETS} {t.largeMiddle}{' '}
                {stats.timeSeries.length} {t.largeSuffix}
              </p>
            )}
            <ul className="analytics-bars">
              {visibleSeries.map((point) => (
                <li key={point.bucket}>
                  <span title={formatFullDateTime(point.bucket, 'UTC')}>
                    {formatUtc(point.bucket, t.noPeriod, stats.granularity === 'hour')}
                  </span>
                  <div aria-hidden="true">
                    <i
                      style={{
                        width: `${Math.max(2, (point.clicks / maximum) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong aria-label={`${point.clicks} ${t.clicks}`}>
                    {point.clicks}
                  </strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <DashboardEmpty
            title={t.noPeriod}
            text={t.noPeriodText}
          />
        )}
      </section>
      <div className="dashboard-analytics-grid">
        <Breakdown
          title={t.referrers}
          description={t.referrerLead}
          rows={stats.breakdowns.referrers}
          empty={t.noReferrers}
          direct={t.direct}
        />
        <Breakdown
          title={t.agents}
          description={t.agentsLead}
          rows={stats.breakdowns.userAgents}
          empty={t.noAgents}
          direct={t.direct}
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
  direct,
}: {
  title: string;
  description: string;
  rows: { value: string; clicks: number }[];
  empty: string;
  direct: string;
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
              <span title={row.value}>{row.value || direct}</span>
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

function PageHeader({ text: t }: { text: Translation['dashboard']['analytics'] }) {
  return (
    <header className="dashboard-page-header">
      <div>
        <p className="dashboard-eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </div>
    </header>
  );
}
