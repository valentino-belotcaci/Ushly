import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../api/session';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Input } from '../../components/Input';
import { Pagination } from '../../components/Pagination';
import { Table } from '../../components/Table';
import { useToast } from '../../components/toast-context';
import {
  createOwnedLink,
  deleteOwnedLink,
  getOwnedQr,
  publicShortUrl,
  setOwnedLinkActive,
  updateOwnedLink,
  type OwnedLink,
} from './api';
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
} from './DashboardState';
import { DashboardIcon } from './icons';
import { useOwnedLinks } from './useOwnedLinks';

const pageSizes = [10, 20, 50] as const;

function safeMessage(failure: unknown): string {
  return failure instanceof ApiClientError
    ? failure.message
    : 'The link could not be updated. Please try again.';
}

function validateUrl(value: string): string {
  if (!value) return 'Enter a destination URL.';
  if (value.length > 2048) return 'The destination URL is too long.';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return 'Use an HTTP or HTTPS URL.';
  } catch {
    return 'Enter a complete URL, including https://.';
  }
  return '';
}

function validateExpiration(value: string): string {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) || timestamp <= Date.now()
    ? 'Choose a future expiration date and time.'
    : '';
}

function localDateTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function displayDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function displayedStatus(link: OwnedLink): 'Active' | 'Disabled' | 'Expired' {
  if (link.expiresAt && Date.parse(link.expiresAt) <= Date.now()) return 'Expired';
  if (link.status === 'disabled') return 'Disabled';
  return 'Active';
}

function LinkStatusBadge({ link }: { link: OwnedLink }) {
  const status = displayedStatus(link);
  return (
    <Badge
      tone={
        status === 'Active'
          ? 'success'
          : status === 'Expired'
            ? 'warning'
            : 'neutral'
      }
    >
      {status}
    </Badge>
  );
}

type Confirmation =
  { kind: 'delete'; link: OwnedLink } | { kind: 'deactivate'; link: OwnedLink };

type CreateLinkInput = {
  url: string;
  title?: string;
  expiresAt?: string;
};

function CreateLinkForm({
  disabled,
  loading,
  onSubmit,
}: {
  disabled: boolean;
  loading: boolean;
  onSubmit: (input: CreateLinkInput) => Promise<boolean>;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [urlError, setUrlError] = useState('');
  const [expirationError, setExpirationError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const nextUrlError = validateUrl(url.trim());
    const nextExpirationError = validateExpiration(expiresAt);
    setUrlError(nextUrlError);
    setExpirationError(nextExpirationError);
    if (nextUrlError || nextExpirationError) return;
    const created = await onSubmit({
      url: url.trim(),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    });
    if (!created) return;
    setUrl('');
    setTitle('');
    setExpiresAt('');
  }

  return (
    <form className="dashboard-create-form" onSubmit={submit} noValidate>
      <Input
        label="Destination URL"
        type="url"
        autoComplete="url"
        required
        maxLength={2048}
        placeholder="https://example.com/long-url"
        value={url}
        {...(urlError ? { error: urlError } : {})}
        onChange={(event) => {
          setUrl(event.target.value);
          if (urlError) setUrlError('');
        }}
        disabled={disabled}
      />
      <Input
        label="Title (optional)"
        maxLength={200}
        placeholder="Campaign link"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={disabled}
      />
      <Input
        label="Expires at (optional)"
        type="datetime-local"
        value={expiresAt}
        {...(expirationError ? { error: expirationError } : {})}
        onChange={(event) => {
          setExpiresAt(event.target.value);
          if (expirationError) setExpirationError('');
        }}
        disabled={disabled}
      />
      <Button type="submit" loading={loading} disabled={disabled}>
        Shorten link
      </Button>
    </form>
  );
}

export function LinksPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof pageSizes)[number]>(20);
  const { data, loading, error, reload } = useOwnedLinks(page, pageSize);
  const [urlError, setUrlError] = useState('');
  const [expirationError, setExpirationError] = useState('');
  const [busy, setBusy] = useState('');
  const [pageError, setPageError] = useState('');
  const [editing, setEditing] = useState<OwnedLink | null>(null);
  const [originalExpiration, setOriginalExpiration] = useState<string | null>(
    null,
  );
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [copiedId, setCopiedId] = useState('');
  const copyTimer = useRef<number | null>(null);
  const [qrLink, setQrLink] = useState<OwnedLink | null>(null);
  const [qrSource, setQrSource] = useState('');
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState('');
  const qrAttempt = useRef(0);
  const qrObjectUrl = useRef('');
  const notify = useToast();

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      qrAttempt.current += 1;
      if (qrObjectUrl.current) URL.revokeObjectURL(qrObjectUrl.current);
    },
    [],
  );

  function clearQr() {
    qrAttempt.current += 1;
    if (qrObjectUrl.current) URL.revokeObjectURL(qrObjectUrl.current);
    qrObjectUrl.current = '';
    setQrSource('');
    setQrError('');
    setQrBusy(false);
    setQrLink(null);
  }

  async function create(input: CreateLinkInput): Promise<boolean> {
    if (busy) return false;
    setBusy('create');
    setPageError('');
    try {
      await createOwnedLink(input);
      if (page === 1) await reload();
      else setPage(1);
      notify('Link created successfully.', 'success', 3000);
      return true;
    } catch (failure) {
      setPageError(safeMessage(failure));
      return false;
    } finally {
      setBusy('');
    }
  }

  async function mutate(
    id: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    if (busy) return false;
    setBusy(id);
    setPageError('');
    try {
      await action();
      await reload();
      notify(success, 'success', 3000);
      return true;
    } catch (failure) {
      setPageError(safeMessage(failure));
      return false;
    } finally {
      setBusy('');
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const nextUrlError = validateUrl(editing.destinationUrl.trim());
    const expirationChanged = editing.expiresAt !== originalExpiration;
    const nextExpirationError = expirationChanged
      ? validateExpiration(localDateTime(editing.expiresAt))
      : '';
    setUrlError(nextUrlError);
    setExpirationError(nextExpirationError);
    if (nextUrlError || nextExpirationError) return;
    const saved = await mutate(
      editing.id,
      () =>
        updateOwnedLink(editing.id, {
          url: editing.destinationUrl.trim(),
          title: editing.title?.trim() || null,
          ...(expirationChanged ? { expiresAt: editing.expiresAt } : {}),
        }),
      'Link updated successfully.',
    );
    if (saved) setEditing(null);
  }

  async function copy(link: OwnedLink) {
    try {
      await navigator.clipboard.writeText(publicShortUrl(link.shortCode));
      setCopiedId(link.id);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        setCopiedId('');
        copyTimer.current = null;
      }, 2000);
    } catch {
      notify(
        'Copy is unavailable. Select the short URL and copy it manually.',
        'warning',
      );
    }
  }

  async function openQr(link: OwnedLink) {
    clearQr();
    setQrLink(link);
    setQrBusy(true);
    const attempt = ++qrAttempt.current;
    try {
      const blob = await getOwnedQr(link.id);
      if (attempt !== qrAttempt.current) return;
      const source = URL.createObjectURL(blob);
      qrObjectUrl.current = source;
      setQrSource(source);
    } catch (failure) {
      if (attempt === qrAttempt.current) setQrError(safeMessage(failure));
    } finally {
      if (attempt === qrAttempt.current) setQrBusy(false);
    }
  }

  async function confirmAction() {
    if (!confirmation) return;
    const { link, kind } = confirmation;
    setConfirmation(null);
    if (kind === 'deactivate') {
      await mutate(
        link.id,
        () => setOwnedLinkActive(link.id, false),
        'Link deactivated.',
      );
      return;
    }
    if (busy) return;
    setBusy(link.id);
    setPageError('');
    try {
      await deleteOwnedLink(link.id);
      if (data?.items.length === 1 && page > 1) setPage(page - 1);
      else await reload();
      notify('Link deleted.', 'success', 3000);
    } catch (failure) {
      setPageError(safeMessage(failure));
    } finally {
      setBusy('');
    }
  }

  const pageCount = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  const rangeStart =
    data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="dashboard-page dashboard-links-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">Manage</p>
          <h1>Links</h1>
          <p>
            Create, share, and control the short links owned by your account.
          </p>
        </div>
      </header>
      <section
        className="card dashboard-create-panel"
        aria-labelledby="create-link-title"
      >
        <header>
          <h2 id="create-link-title">Create a short link</h2>
          <p>Only HTTP and HTTPS destinations are supported.</p>
        </header>
        <CreateLinkForm
          disabled={Boolean(busy)}
          loading={busy === 'create'}
          onSubmit={create}
        />
      </section>
      {pageError && !editing && (
        <p className="dashboard-inline-error" role="alert">
          {pageError}
        </p>
      )}
      {loading ? (
        <DashboardLoading label="Loading your links…" />
      ) : error ? (
        <DashboardError message={error} retry={() => void reload()} />
      ) : !data?.items.length ? (
        <DashboardEmpty
          title="No owned links"
          text="Create your first link above. Links created while signed in will appear here."
        />
      ) : (
        <section
          className="dashboard-links-section"
          aria-labelledby="owned-links-title"
        >
          <header className="dashboard-links-toolbar">
            <div>
              <h2 id="owned-links-title">Your links</h2>
              <p>
                Showing {rangeStart}–{rangeEnd} of {data.total}
              </p>
            </div>
            <label>
              Rows per page
              <select
                className="input dashboard-page-size"
                value={pageSize}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (next === 10 || next === 20 || next === 50) {
                    setPageSize(next);
                    setPage(1);
                  }
                }}
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </header>
          <Table
            caption="Short links owned by your account"
            className="dashboard-links-table"
          >
            <thead>
              <tr>
                <th scope="col">Link</th>
                <th scope="col">Status</th>
                <th scope="col">Expiration</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((link) => (
                <tr key={link.id}>
                  <td data-label="Link">
                    <div className="dashboard-link-details">
                      <strong>{link.title ?? 'Untitled link'}</strong>
                      <a
                        className="dashboard-short-url"
                        href={publicShortUrl(link.shortCode)}
                        target="_blank"
                        rel="noreferrer"
                        title={publicShortUrl(link.shortCode)}
                        aria-label={publicShortUrl(link.shortCode)}
                      >
                        {publicShortUrl(link.shortCode)}
                      </a>
                      <span
                        title={link.destinationUrl}
                        aria-label={link.destinationUrl}
                      >
                        {link.destinationUrl}
                      </span>
                    </div>
                  </td>
                  <td data-label="Status">
                    <LinkStatusBadge link={link} />
                  </td>
                  <td data-label="Expiration">
                    <span className="dashboard-expiration">
                      {displayDate(link.expiresAt)}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="dashboard-link-actions">
                      <a
                        className="button button--quiet"
                        href={publicShortUrl(link.shortCode)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Visit short URL"
                        title="Visit short URL"
                      >
                        <DashboardIcon name="external" />
                        <span className="dashboard-action-label">Visit</span>
                      </a>
                      <Button
                        variant="quiet"
                        aria-live="polite"
                        aria-label={
                          copiedId === link.id
                            ? 'Short URL copied'
                            : 'Copy short URL'
                        }
                        title="Copy short URL"
                        onClick={() => void copy(link)}
                      >
                        <DashboardIcon name="copy" />
                        <span className="dashboard-action-label">
                          {copiedId === link.id ? 'Copied' : 'Copy'}
                        </span>
                      </Button>
                      <Button
                        variant="quiet"
                        aria-label="Preview and download QR code"
                        title="Preview and download QR code"
                        onClick={() => void openQr(link)}
                      >
                        <DashboardIcon name="qr" />
                        <span className="dashboard-action-label">QR</span>
                      </Button>
                      <Button
                        variant="quiet"
                        aria-label="Edit link"
                        title="Edit link"
                        onClick={() => {
                          setUrlError('');
                          setExpirationError('');
                          setPageError('');
                          setOriginalExpiration(link.expiresAt);
                          setEditing(link);
                        }}
                      >
                        <DashboardIcon name="edit" />
                        <span className="dashboard-action-label">Edit</span>
                      </Button>
                      {displayedStatus(link) !== 'Expired' &&
                        (displayedStatus(link) === 'Active' ? (
                          <Button
                            variant="secondary"
                            loading={busy === link.id}
                            aria-label="Disable link"
                            title="Disable link"
                            onClick={() =>
                              setConfirmation({ kind: 'deactivate', link })
                            }
                          >
                            <DashboardIcon name="power" />
                            <span className="dashboard-action-label">
                              Disable
                            </span>
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            loading={busy === link.id}
                            aria-label="Enable link"
                            title="Enable link"
                            onClick={() =>
                              void mutate(
                                link.id,
                                () => setOwnedLinkActive(link.id, true),
                                'Link enabled.',
                              )
                            }
                          >
                            <DashboardIcon name="power" />
                            <span className="dashboard-action-label">
                              Enable
                            </span>
                          </Button>
                        ))}
                      <Button
                        variant="danger"
                        loading={busy === link.id}
                        aria-label="Delete link"
                        title="Delete link"
                        onClick={() =>
                          setConfirmation({ kind: 'delete', link })
                        }
                      >
                        <DashboardIcon name="trash" />
                        <span className="dashboard-action-label">Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data.total > data.pageSize && (
            <Pagination
              page={data.page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          )}
        </section>
      )}
      {editing && (
        <Dialog
          open
          onClose={() => setEditing(null)}
          title="Edit link"
          description="Update this owned link. Expiration must be in the future."
        >
          <form className="dashboard-edit-form" onSubmit={saveEdit} noValidate>
            <Input
              label="Destination URL"
              type="url"
              autoComplete="url"
              required
              maxLength={2048}
              value={editing.destinationUrl}
              {...(urlError ? { error: urlError } : {})}
              onChange={(event) => {
                setEditing({ ...editing, destinationUrl: event.target.value });
                if (urlError) setUrlError('');
              }}
            />
            <Input
              label="Title"
              maxLength={200}
              value={editing.title ?? ''}
              onChange={(event) =>
                setEditing({ ...editing, title: event.target.value })
              }
            />
            <Input
              label="Expires at"
              type="datetime-local"
              value={localDateTime(editing.expiresAt)}
              {...(expirationError ? { error: expirationError } : {})}
              onChange={(event) => {
                setEditing({
                  ...editing,
                  expiresAt: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : null,
                });
                if (expirationError) setExpirationError('');
              }}
            />
            {pageError && (
              <p className="dashboard-inline-error" role="alert">
                {pageError}
              </p>
            )}
            <div className="row">
              <Button type="submit" loading={busy === editing.id}>
                Save changes
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {confirmation && (
        <Dialog
          open
          onClose={() => setConfirmation(null)}
          title={
            confirmation.kind === 'delete' ? 'Delete link?' : 'Disable link?'
          }
          description={
            confirmation.kind === 'delete'
              ? 'This permanently removes the link and its owner access. This action cannot be undone.'
              : 'The public short URL will stop redirecting until you enable it again.'
          }
        >
          <div className="dashboard-confirm-actions">
            <Button
              variant={confirmation.kind === 'delete' ? 'danger' : 'primary'}
              onClick={() => void confirmAction()}
            >
              {confirmation.kind === 'delete' ? 'Delete link' : 'Disable link'}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmation(null)}>
              Cancel
            </Button>
          </div>
        </Dialog>
      )}
      {qrLink && (
        <Dialog
          open
          onClose={clearQr}
          title="Download QR code"
          description={`This QR code contains ${publicShortUrl(qrLink.shortCode)}.`}
        >
          <div className="dashboard-qr-dialog">
            <div className="dashboard-qr-preview">
              {qrBusy ? (
                <DashboardLoading label="Loading QR code…" />
              ) : qrError ? (
                <DashboardError
                  message={qrError}
                  retry={() => void openQr(qrLink)}
                />
              ) : (
                qrSource && (
                  <img
                    src={qrSource}
                    alt={`QR code for ${publicShortUrl(qrLink.shortCode)}`}
                  />
                )
              )}
            </div>
            <div className="dashboard-qr-copy">
              <strong>{qrLink.title ?? 'Untitled link'}</strong>
              <span>{publicShortUrl(qrLink.shortCode)}</span>
              {qrSource && (
                <a
                  className="button button--primary"
                  href={qrSource}
                  download={`ushly-${qrLink.shortCode}.svg`}
                >
                  <DashboardIcon name="download" />
                  Download SVG
                </a>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
