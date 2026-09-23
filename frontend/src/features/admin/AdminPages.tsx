import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router';
import { ApiClientError } from '../../api/session';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
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

const PAGE_SIZE = 20;
function useDebouncedValue<T>(value: T, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}
function message(error: unknown) {
  return error instanceof ApiClientError
    ? error.message
    : 'The administrative data could not be loaded.';
}
function denied(error: unknown) {
  return error instanceof ApiClientError && error.status === 403;
}
function formatUtc(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(value))
    : '—';
}
function utcInput(date: Date) {
  return date.toISOString().slice(0, 16);
}
function iso(value: string) {
  return new Date(`${value}:00.000Z`).toISOString();
}

function AdminHeader({ title, text }: { title: string; text: string }) {
  return (
    <>
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">Administration</p>
          <h1>{title}</h1>
          <p>{text}</p>
        </div>
      </header>
      <nav className="admin-tabs" aria-label="Administration">
        <NavLink end to="/dashboard/admin">
          Statistics
        </NavLink>
        <NavLink to="/dashboard/admin/users">Users</NavLink>
        <NavLink to="/dashboard/admin/links">Links</NavLink>
      </nav>
    </>
  );
}
function Unauthorized() {
  return (
    <div className="dashboard-page">
      <AdminHeader
        title="Administration"
        text="Restricted workspace controls."
      />
      <section className="card admin-unauthorized" role="alert">
        <h2>Administrator access required</h2>
        <p>Your account is not authorized to view these controls.</p>
        <Link to="/dashboard">Return to overview</Link>
      </section>
    </div>
  );
}

export function AdminOverviewPage() {
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
        else setError(message(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied]);
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
      setRangeError('Choose a UTC start time earlier than the end time.');
      return;
    }
    if (end.getTime() - start.getTime() > 90 * 86400000) {
      setRangeError('The statistics range cannot exceed 90 days.');
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
          title="Global statistics"
          text="Review aggregate click activity across the service."
        />
        {error ? (
          <DashboardError message={error} />
        ) : (
          <DashboardLoading label="Checking administrator access…" />
        )}
      </div>
    );
  return (
    <div className="dashboard-page">
      <AdminHeader
        title="Global statistics"
        text="Review aggregate click activity across the service."
      />
      <form className="card admin-filter" onSubmit={submit}>
        <label>
          From (UTC)
          <input
            className="input"
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          To (UTC)
          <input
            className="input"
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <Button type="submit">Apply range</Button>
        {rangeError && (
          <p className="dashboard-inline-error" role="alert">
            {rangeError}
          </p>
        )}
      </form>
      {loading ? (
        <DashboardLoading label="Loading global statistics…" />
      ) : error ? (
        <DashboardError message={error} />
      ) : data ? (
        <>
          <p className="analytics-timezone" role="note">
            All administrative statistics use UTC.
          </p>
          <section
            className="dashboard-metrics"
            aria-label="Global statistics summary"
          >
            <article className="card metric-card">
              <div>
                <span>Total clicks</span>
                <strong>{data.total.toLocaleString()}</strong>
              </div>
            </article>
            <article className="card metric-card">
              <div>
                <span>First click · UTC</span>
                <strong className="metric-date">
                  {formatUtc(data.firstClickedAt)}
                </strong>
              </div>
            </article>
            <article className="card metric-card">
              <div>
                <span>Last click · UTC</span>
                <strong className="metric-date">
                  {formatUtc(data.lastClickedAt)}
                </strong>
              </div>
            </article>
          </section>
          <section className="card dashboard-panel analytics-section">
            <header>
              <div>
                <h2>Daily clicks</h2>
                <p>Global totals · UTC</p>
              </div>
            </header>
            {data.timeSeries.length ? (
              <ul className="analytics-bars">
                {data.timeSeries.map((point) => (
                  <li key={point.bucket}>
                    <span>{formatUtc(point.bucket)}</span>
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
                title="No clicks in this period"
                text="Global activity will appear here after redirects are recorded."
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export function AdminUsersPage() {
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
      else setError(message(failure));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, disabled, page, role]);
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
        `User ${next ? 'disabled' : 'enabled'}. The server recorded the administrative action.`,
      );
      setTarget(null);
      await load();
    } catch (failure) {
      setError(message(failure));
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
          title="Users"
          text="Filter accounts and control whether they can authenticate."
        />
        {error ? (
          <DashboardError message={error} retry={() => void load()} />
        ) : (
          <DashboardLoading label="Checking administrator access…" />
        )}
      </div>
    );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="dashboard-page">
      <AdminHeader
        title="Users"
        text="Filter accounts and control whether they can authenticate."
      />
      <section className="card admin-filter admin-filter--users" aria-label="User filters">
        <label className="admin-filter__primary">
          Search by email
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
          Role
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
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label>
          Status
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
            <option value="">All statuses</option>
            <option value="false">Enabled</option>
            <option value="true">Disabled</option>
          </select>
        </label>
      </section>
      {status && (
        <p className="dashboard-success" role="status">
          {status}
        </p>
      )}
      {loading ? (
        <DashboardLoading label="Loading users…" />
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
          title="No users found"
          text="No accounts match the selected filters."
        />
      )}
      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={`${target?.disabledAt ? 'Enable' : 'Disable'} user`}
        description="This changes whether the account can authenticate. The backend remains the authorization boundary."
      >
        <div className="dashboard-confirm-actions">
          <Button variant="secondary" onClick={() => setTarget(null)}>
            Cancel
          </Button>
          <Button
            variant={target?.disabledAt ? 'primary' : 'danger'}
            loading={busy}
            onClick={() => void confirm()}
          >
            Confirm
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
  return (
    <div className="table-scroll">
      <table className="table admin-table">
        <caption>Administrative user results</caption>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created · UTC</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.email}</strong>
                <small>{user.name ?? user.provider}</small>
              </td>
              <td>
                <Badge tone={user.role === 'ADMIN' ? 'warning' : 'neutral'}>
                  {user.role}
                </Badge>
              </td>
              <td>
                <Badge tone={user.disabledAt ? 'danger' : 'success'}>
                  {user.disabledAt ? 'Disabled' : 'Enabled'}
                </Badge>
              </td>
              <td>{formatUtc(user.createdAt)}</td>
              <td>
                <Button
                  variant={user.disabledAt ? 'secondary' : 'danger'}
                  onClick={() => onToggle(user)}
                >
                  {user.disabledAt ? 'Enable' : 'Disable'}
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | AdminLink['status']>('');
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
      else setError(message(failure));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, debouncedUserId, filterStatus, page]);
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
        `Link ${next ? 'disabled' : 'enabled'}. The server recorded the administrative action.`,
      );
      setTarget(null);
      await load();
    } catch (failure) {
      setError(message(failure));
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
          title="Links"
          text="Filter links across the service and control redirect availability."
        />
        {error ? (
          <DashboardError message={error} retry={() => void load()} />
        ) : (
          <DashboardLoading label="Checking administrator access…" />
        )}
      </div>
    );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="dashboard-page">
      <AdminHeader
        title="Links"
        text="Filter links across the service and control redirect availability."
      />
      <section className="card admin-filter admin-filter--links" aria-label="Link filters">
        <label className="admin-filter__primary">
          Search links or owner email
          <input
            className="input"
            type="search"
            placeholder="URL, short code, or owner email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Status
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
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <label>
          Owner ID
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
        <DashboardLoading label="Loading links…" />
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
          title="No links found"
          text="No links match the selected filters."
        />
      )}
      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={`${target?.status === 'disabled' ? 'Enable' : 'Disable'} link`}
        description="This changes whether the public short URL redirects. Ownership checks remain on the backend."
      >
        <div className="dashboard-confirm-actions">
          <Button variant="secondary" onClick={() => setTarget(null)}>
            Cancel
          </Button>
          <Button
            variant={target?.status === 'disabled' ? 'primary' : 'danger'}
            loading={busy}
            onClick={() => void confirm()}
          >
            Confirm
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
  return (
    <div className="table-scroll">
      <table className="table admin-table">
        <caption>Administrative link results</caption>
        <thead>
          <tr>
            <th>Link</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Expires · UTC</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((link) => (
            <tr key={link.id}>
              <td>
                <strong>{link.title ?? link.shortCode}</strong>
                <small title={link.destinationUrl}>{link.destinationUrl}</small>
              </td>
              <td>
                <span className="admin-owner-email">
                  {link.ownerEmail ?? 'Anonymous'}
                </span>
                {link.userId && (
                  <small className="admin-owner-id" title={link.userId}>
                    ID: {link.userId}
                  </small>
                )}
              </td>
              <td>
                <Badge
                  tone={
                    link.status === 'active'
                      ? 'success'
                      : link.status === 'expired'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {link.status}
                </Badge>
              </td>
              <td>{formatUtc(link.expiresAt)}</td>
              <td>
                <Button
                  variant={link.status === 'disabled' ? 'secondary' : 'danger'}
                  disabled={link.status === 'expired'}
                  onClick={() => onToggle(link)}
                >
                  {link.status === 'disabled' ? 'Enable' : 'Disable'}
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
  return (
    <nav className="dashboard-pagination" aria-label="Admin results pages">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {page} of {pages} · {total.toLocaleString()} results
      </span>
      <Button
        variant="secondary"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
