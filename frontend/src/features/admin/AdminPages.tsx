import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router';
import { ApiClientError } from '../../api/session';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { formatDateTime, formatFullDateTime } from '../../utils/dateTime';
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from '../dashboard/DashboardState';
import {
  getAdminStatistics,
  listAdminLinks,
  listAdminUsers,
  setAdminLinkDisabled,
  setAdminUserDisabled,
  type AdminLink,
  type AdminStatistics,
  type AdminUser,
} from './api';
import './admin.css';
import { translations } from '../../i18n';
import { useLocale, useLocalizedRoute } from '../../i18n/locale';

const PAGE_SIZE = 20;
function useDebouncedValue<T>(value: T, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}
function message(error: unknown, fallback: string) {
  return error instanceof ApiClientError
    ? error.message
    : fallback;
}
function denied(error: unknown) {
  return error instanceof ApiClientError && error.status === 403;
}
function formatUtc(value: string | null) {
  return formatDateTime(value, { timeZone: 'UTC' });
}
function utcInput(date: Date) {
  return date.toISOString().slice(0, 16);
}
function iso(value: string) {
  return new Date(`${value}:00.000Z`).toISOString();
}

function AdminHeader({ title, text }: { title: string; text: string }) {
  const t = translations(useLocale()).admin;
  const route = useLocalizedRoute();
  return (
    <>
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">{t.eyebrow}</p>
          <h1>{title}</h1>
          <p>{text}</p>
        </div>
      </header>
      <nav className="admin-tabs" aria-label={t.label}>
        <NavLink end to={route('/dashboard/admin')}>
          {t.global}
        </NavLink>
        <NavLink to={route('/dashboard/admin/users')}>{t.users}</NavLink>
        <NavLink to={route('/dashboard/admin/links')}>{t.links}</NavLink>
      </nav>
    </>
  );
}
function Unauthorized() {
  const t = translations(useLocale()).admin;
  const route = useLocalizedRoute();
  return (
    <div className="dashboard-page">
      <AdminHeader
        title={t.label}
        text={t.restricted}
      />
      <section className="card admin-unauthorized" role="alert">
        <h2>{t.required}</h2>
        <p>{t.unauthorized}</p>
        <Link to={route('/dashboard')}>{t.returnOverview}</Link>
      </section>
    </div>
  );
}

export function AdminOverviewPage() {
  const copy = translations(useLocale());
  const t = copy.admin;
  const now = new Date();
  const [from, setFrom] = useState(
    utcInput(new Date(now.getTime() - 30 * 86400000)),
  );
  const [to, setTo] = useState(utcInput(now));
  const [applied, setApplied] = useState({ from, to });
  const [data, setData] = useState<AdminStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [verified, setVerified] = useState(false);
  const [rangeError, setRangeError] = useState('');
  useEffect(() => {
    let active = true;
    const pending = Promise.resolve().then(() => {
      if (active) {
        setLoading(true);
        setError('');
      }
      return getAdminStatistics(iso(applied.from), iso(applied.to));
    });
    void pending
      .then((value) => {
        if (active) {
          setData(value);
          setVerified(true);
        }
      })
      .catch((failure) => {
        if (!active) return;
        if (denied(failure)) setUnauthorized(true);
        else setError(message(failure, t.loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied, t.loadError]);
  function submit(event: FormEvent) {
    event.preventDefault();
    const start = new Date(`${from}:00.000Z`);
    const end = new Date(`${to}:00.000Z`);
    if (
      !from ||
      !to ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      setRangeError(t.invalidRange);
      return;
    }
    if (end.getTime() - start.getTime() > 90 * 86400000) {
      setRangeError(t.rangeLong);
      return;
    }
    setRangeError('');
    setApplied({ from, to });
  }
  if (unauthorized) return <Unauthorized />;
  if (!verified)
    return (
      <div className="dashboard-page">
        <AdminHeader
          title={t.global}
          text={t.globalLead}
        />
        {error ? (
          <DashboardError message={error} />
        ) : (
          <DashboardLoading label={t.checking} />
        )}
      </div>
    );
  return (
    <div className="dashboard-page">
      <AdminHeader
        title={t.global}
        text={t.globalLead}
      />
      <form className="card admin-filter" onSubmit={submit}>
        <label>
          {t.from}
          <input
            className="input"
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          {t.to}
          <input
            className="input"
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <Button type="submit">{t.apply}</Button>
        {rangeError && (
          <p className="dashboard-inline-error" role="alert">
            {rangeError}
          </p>
        )}
      </form>
      {loading ? (
        <DashboardLoading label={t.loadingGlobal} variant="cards" />
      ) : error ? (
        <DashboardError message={error} />
      ) : data ? (
        <>
          <p className="analytics-timezone" role="note">
            {t.allUtc}
          </p>
          <section
            className="dashboard-metrics"
            aria-label={t.summary}
          >
            <article className="card metric-card">
              <div>
                <span>{t.totalClicks}</span>
                <strong>{data.total.toLocaleString()}</strong>
              </div>
            </article>
            <article className="card metric-card">
              <div>
                <span>{t.firstClick}</span>
                <strong
                  className="metric-date"
                  title={
                    data.firstClickedAt
                      ? formatFullDateTime(data.firstClickedAt, 'UTC')
                      : undefined
                  }
                >
                  {formatUtc(data.firstClickedAt)}
                </strong>
              </div>
            </article>
            <article className="card metric-card">
              <div>
                <span>{t.lastClick}</span>
                <strong
                  className="metric-date"
                  title={
                    data.lastClickedAt
                      ? formatFullDateTime(data.lastClickedAt, 'UTC')
                      : undefined
                  }
                >
                  {formatUtc(data.lastClickedAt)}
                </strong>
              </div>
            </article>
          </section>
          <section className="card dashboard-panel analytics-section">
            <header>
              <div>
                <h2>{t.daily}</h2>
                <p>{t.globalTotals}</p>
              </div>
            </header>
            {data.timeSeries.length ? (
              <ul className="analytics-bars">
                {data.timeSeries.map((point) => (
                  <li key={point.bucket}>
                    <span title={formatFullDateTime(point.bucket, 'UTC')}>
                      {formatUtc(point.bucket)}
                    </span>
                    <div aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.max(2, data.total ? (point.clicks / data.total) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                    <strong>{point.clicks}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <DashboardEmpty
                title={t.noClicks}
                text={t.noClicksText}
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export function AdminUsersPage() {
  const copy = translations(useLocale());
  const t = copy.admin;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'' | AdminUser['role']>('');
  const [disabled, setDisabled] = useState<'' | 'true' | 'false'>('');
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [verified, setVerified] = useState(false);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdminUsers({
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(role ? { role } : {}),
        ...(disabled === '' ? {} : { disabled: disabled === 'true' }),
      });
      setItems(result.items);
      setTotal(result.total);
      setVerified(true);
    } catch (failure) {
      if (denied(failure)) setUnauthorized(true);
      else setError(message(failure, t.loadError));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, disabled, page, role, t.loadError]);
  useEffect(() => {
    const pending = Promise.resolve().then(load);
    void pending;
  }, [load]);
  async function confirm() {
    if (!target || busy) return;
    setBusy(true);
    try {
      const next = target.disabledAt === null;
      await setAdminUserDisabled(target.id, next);
      setStatus(
        next ? t.userDisabled : t.userEnabled,
      );
      setTarget(null);
      await load();
    } catch (failure) {
      setError(message(failure, t.loadError));
      setTarget(null);
    } finally {
      setBusy(false);
    }
  }
  if (unauthorized) return <Unauthorized />;
  if (!verified)
    return (
      <div className="dashboard-page">
        <AdminHeader
          title={t.users}
          text={t.usersLead}
        />
        {error ? (
          <DashboardError message={error} retry={() => void load()} />
        ) : (
          <DashboardLoading label={t.checking} />
        )}
      </div>
    );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="dashboard-page">
      <AdminHeader
        title={t.users}
        text={t.usersLead}
      />
      <section
        className="card admin-filter admin-filter--users"
        aria-label={t.userFilters}
      >
        <label className="admin-filter__primary">
          {t.searchEmail}
          <input
            className="input"
            type="search"
            placeholder="name@example.com"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          {t.role}
          <select
            className="input"
            value={role}
            onChange={(event) => {
              const value = event.target.value;
              if (value === '' || value === 'USER' || value === 'ADMIN')
                setRole(value);
              setPage(1);
            }}
          >
            <option value="">{t.allRoles}</option>
            <option value="USER">{t.user}</option>
            <option value="ADMIN">{t.administrator}</option>
          </select>
        </label>
        <label>
          {copy.common.status}
          <select
            className="input"
            value={disabled}
            onChange={(event) => {
              const value = event.target.value;
              if (value === '' || value === 'true' || value === 'false')
                setDisabled(value);
              setPage(1);
            }}
          >
            <option value="">{t.allStatuses}</option>
            <option value="false">{copy.common.enabled}</option>
            <option value="true">{copy.common.disabled}</option>
          </select>
        </label>
      </section>
      {status && (
        <p className="dashboard-success" role="status">
          {status}
        </p>
      )}
      {loading ? (
        <DashboardLoading label={t.loadingUsers} variant="admin" />
      ) : error ? (
        <DashboardError message={error} retry={() => void load()} />
      ) : items.length ? (
        <>
          <AdminUsersTable items={items} onToggle={setTarget} />
          <Pagination
            page={page}
            pages={pages}
            setPage={setPage}
            total={total}
          />
        </>
      ) : (
        <DashboardEmpty
          title={t.noUsers}
          text={t.noUsersText}
        />
      )}
      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.disabledAt ? t.enableUser : t.disableUser}
        description={t.userToggleDescription}
      >
        <div className="dashboard-confirm-actions">
          <Button variant="secondary" onClick={() => setTarget(null)}>
            {copy.common.cancel}
          </Button>
          <Button
            variant={target?.disabledAt ? 'primary' : 'danger'}
            loading={busy}
            onClick={() => void confirm()}
          >
            {copy.common.confirm}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function AdminUsersTable({
  items,
  onToggle,
}: {
  items: AdminUser[];
  onToggle: (user: AdminUser) => void;
}) {
  const copy = translations(useLocale());
  const t = copy.admin;
  return (
    <div className="table-scroll admin-table-scroll">
      <table className="table admin-table">
        <caption>{t.userResults}</caption>
        <thead>
          <tr>
            <th>{t.user}</th>
            <th>{t.role}</th>
            <th>{copy.common.status}</th>
            <th>{copy.common.created}</th>
            <th>{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td data-label={t.user}>
                <div className="admin-cell-stack">
                  <strong title={user.email}>{user.email}</strong>
                  <small title={user.name ?? user.provider}>
                    {user.name ?? user.provider}
                  </small>
                </div>
              </td>
              <td data-label={t.role}>
                <Badge tone={user.role === 'ADMIN' ? 'warning' : 'neutral'}>
                  {user.role === 'ADMIN' ? t.administrator : t.user}
                </Badge>
              </td>
              <td data-label={copy.common.status}>
                <Badge tone={user.disabledAt ? 'danger' : 'success'}>
                  {user.disabledAt ? copy.common.disabled : copy.common.enabled}
                </Badge>
              </td>
              <td data-label={copy.common.created}>
                <time
                  dateTime={user.createdAt}
                  title={formatFullDateTime(user.createdAt)}
                >
                  {formatDateTime(user.createdAt)}
                </time>
              </td>
              <td data-label={t.action}>
                <Button
                  variant={user.disabledAt ? 'secondary' : 'danger'}
                  onClick={() => onToggle(user)}
                >
                  {user.disabledAt ? copy.common.enable : copy.common.disable}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminLinksPage() {
  const copy = translations(useLocale());
  const t = copy.admin;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | AdminLink['status']>(
    '',
  );
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<AdminLink[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [verified, setVerified] = useState(false);
  const [target, setTarget] = useState<AdminLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedUserId = useDebouncedValue(userId.trim());
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdminLinks({
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(debouncedUserId ? { userId: debouncedUserId } : {}),
      });
      setItems(result.items);
      setTotal(result.total);
      setVerified(true);
    } catch (failure) {
      if (denied(failure)) setUnauthorized(true);
      else setError(message(failure, t.loadError));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, debouncedUserId, filterStatus, page, t.loadError]);
  useEffect(() => {
    const pending = Promise.resolve().then(load);
    void pending;
  }, [load]);
  async function confirm() {
    if (!target || busy) return;
    setBusy(true);
    try {
      const next = target.status !== 'disabled';
      await setAdminLinkDisabled(target.id, next);
      setStatus(
        next ? t.linkDisabled : t.linkEnabled,
      );
      setTarget(null);
      await load();
    } catch (failure) {
      setError(message(failure, t.loadError));
      setTarget(null);
    } finally {
      setBusy(false);
    }
  }
  if (unauthorized) return <Unauthorized />;
  if (!verified)
    return (
      <div className="dashboard-page">
        <AdminHeader
          title={t.links}
          text={t.linksLead}
        />
        {error ? (
          <DashboardError message={error} retry={() => void load()} />
        ) : (
          <DashboardLoading label={t.checking} />
        )}
      </div>
    );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="dashboard-page">
      <AdminHeader
        title={t.links}
        text={t.linksLead}
      />
      <section
        className="card admin-filter admin-filter--links"
        aria-label={t.linkFilters}
      >
        <label className="admin-filter__primary">
          {t.searchLinks}
          <input
            className="input"
            type="search"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          {copy.common.status}
          <select
            className="input"
            value={filterStatus}
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === '' ||
                value === 'active' ||
                value === 'disabled' ||
                value === 'expired'
              )
                setFilterStatus(value);
              setPage(1);
            }}
          >
            <option value="">{t.allStatuses}</option>
            <option value="active">{copy.common.active}</option>
            <option value="disabled">{copy.common.disabled}</option>
            <option value="expired">{copy.common.expired}</option>
          </select>
        </label>
        <label>
          {t.ownerId}
          <input
            className="input"
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </section>
      {status && (
        <p className="dashboard-success" role="status">
          {status}
        </p>
      )}
      {loading ? (
        <DashboardLoading label={t.loadingLinks} variant="admin" />
      ) : error ? (
        <DashboardError message={error} retry={() => void load()} />
      ) : items.length ? (
        <>
          <AdminLinksTable items={items} onToggle={setTarget} />
          <Pagination
            page={page}
            pages={pages}
            setPage={setPage}
            total={total}
          />
        </>
      ) : (
        <DashboardEmpty
          title={t.noLinks}
          text={t.noLinksText}
        />
      )}
      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.status === 'disabled' ? t.enableLink : t.disableLink}
        description={t.linkToggleDescription}
      >
        <div className="dashboard-confirm-actions">
          <Button variant="secondary" onClick={() => setTarget(null)}>
            {copy.common.cancel}
          </Button>
          <Button
            variant={target?.status === 'disabled' ? 'primary' : 'danger'}
            loading={busy}
            onClick={() => void confirm()}
          >
            {copy.common.confirm}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function AdminLinksTable({
  items,
  onToggle,
}: {
  items: AdminLink[];
  onToggle: (link: AdminLink) => void;
}) {
  const copy = translations(useLocale());
  const t = copy.admin;
  return (
    <div className="table-scroll admin-table-scroll">
      <table className="table admin-table">
        <caption>{t.linkResults}</caption>
        <thead>
          <tr>
            <th>{copy.common.link}</th>
            <th>{copy.common.owner}</th>
            <th>{copy.common.status}</th>
            <th>{t.expires}</th>
            <th>{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((link) => (
            <tr key={link.id}>
              <td data-label={copy.common.link}>
                <div className="admin-cell-stack">
                  <strong title={link.title ?? link.shortCode}>
                    {link.title ?? link.shortCode}
                  </strong>
                  <small title={link.destinationUrl}>
                    {link.destinationUrl}
                  </small>
                </div>
              </td>
              <td data-label={copy.common.owner}>
                <div className="admin-cell-stack">
                  <span
                    className="admin-owner-email"
                    title={link.ownerEmail ?? copy.common.anonymous}
                  >
                    {link.ownerEmail ?? copy.common.anonymous}
                  </span>
                  {link.userId && (
                    <small className="admin-owner-id" title={link.userId}>
                      ID: {link.userId}
                    </small>
                  )}
                </div>
              </td>
              <td data-label={copy.common.status}>
                <Badge
                  tone={
                    link.status === 'active'
                      ? 'success'
                      : link.status === 'expired'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {link.status === 'active'
                    ? copy.common.active
                    : link.status === 'expired'
                      ? copy.common.expired
                      : copy.common.disabled}
                </Badge>
              </td>
              <td data-label={t.expires}>
                {link.expiresAt ? (
                  <time
                    dateTime={link.expiresAt}
                    title={formatFullDateTime(link.expiresAt)}
                  >
                    {formatDateTime(link.expiresAt)}
                  </time>
                ) : (
                  '—'
                )}
              </td>
              <td data-label={t.action}>
                <Button
                  variant={link.status === 'disabled' ? 'secondary' : 'danger'}
                  disabled={link.status === 'expired'}
                  onClick={() => onToggle(link)}
                >
                  {link.status === 'disabled'
                    ? copy.common.enable
                    : copy.common.disable}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  pages,
  setPage,
  total,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
  total: number;
}) {
  const copy = translations(useLocale());
  const t = copy.admin;
  return (
    <nav
      className="dashboard-pagination admin-results-pagination"
      aria-label={t.resultsPages}
    >
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        {copy.common.previous}
      </Button>
      <span>
        {copy.common.page} {page} {copy.common.of} {pages} ·{' '}
        {total.toLocaleString()} {copy.common.results}
      </span>
      <Button
        variant="secondary"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        {copy.common.next}
      </Button>
    </nav>
  );
}
