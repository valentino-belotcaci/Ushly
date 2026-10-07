import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../api/session';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Input } from '../../components/Input';
import { Pagination } from '../../components/Pagination';
import { Table } from '../../components/Table';
import { useToast } from '../../components/toast-context';
import { formatDateTime, formatFullDateTime } from '../../utils/dateTime';
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
import { translations, type Translation } from '../../i18n';
import { useLocale } from '../../i18n/locale';
import { displayedLinkStatus } from './linkStatus';

const pageSizes = [10, 20, 50] as const;

function safeMessage(failure: unknown, fallback: string): string {
  return failure instanceof ApiClientError
    ? failure.message
    : fallback;
}

function validateUrl(value: string, text: Translation['dashboard']['links']): string {
  if (!value) return text.urlRequired;
  if (value.length > 2048) return text.urlLong;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return text.urlProtocol;
  } catch {
    return text.urlComplete;
  }
  return '';
}

function validateExpiration(value: string, text: Translation['dashboard']['links']): string {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) || timestamp <= Date.now()
    ? text.futureExpiration
    : '';
}

function localDateTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function displayedStatus(link: OwnedLink): 'Active' | 'Disabled' | 'Expired' {
  const status = displayedLinkStatus(link);
  return status === 'active'
    ? 'Active'
    : status === 'expired'
      ? 'Expired'
      : 'Disabled';
}

function LinkStatusBadge({ link }: { link: OwnedLink }) {
  const common = translations(useLocale()).common;
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
      {status === 'Active'
        ? common.active
        : status === 'Expired'
          ? common.expired
          : common.disabled}
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
  const text = translations(useLocale()).dashboard.links;
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [urlError, setUrlError] = useState('');
  const [expirationError, setExpirationError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const nextUrlError = validateUrl(url.trim(), text);
    const nextExpirationError = validateExpiration(expiresAt, text);
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
        label={text.destination}
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
        label={text.titleOptional}
        maxLength={200}
        placeholder={text.titlePlaceholder}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={disabled}
      />
      <Input
        label={text.expiresOptional}
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
        {text.shorten}
      </Button>
    </form>
  );
}

export function LinksPage() {
  const i18n = translations(useLocale());
  const text = i18n.dashboard.links;
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
      notify(text.created, 'success', 3000);
      return true;
    } catch (failure) {
      setPageError(safeMessage(failure, text.updateError));
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
      setPageError(safeMessage(failure, text.updateError));
      return false;
    } finally {
      setBusy('');
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const nextUrlError = validateUrl(editing.destinationUrl.trim(), text);
    const expirationChanged = editing.expiresAt !== originalExpiration;
    const nextExpirationError = expirationChanged
      ? validateExpiration(localDateTime(editing.expiresAt), text)
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
      text.updated,
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
        text.copyUnavailable,
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
      if (attempt === qrAttempt.current)
        setQrError(safeMessage(failure, text.updateError));
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
        text.deactivated,
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
      notify(text.deleted, 'success', 3000);
    } catch (failure) {
      setPageError(safeMessage(failure, text.updateError));
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
          <p className="dashboard-eyebrow">{text.eyebrow}</p>
          <h1>{text.pageTitle}</h1>
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
          <h2 id="create-link-title">{text.createTitle}</h2>
          <p>{text.createLead}</p>
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
        <DashboardLoading label={text.loading} variant="links" />
      ) : error ? (
        <DashboardError message={error} retry={() => void reload()} />
      ) : !data?.items.length ? (
        <DashboardEmpty
          title={text.empty}
          text={text.emptyText}
        />
      ) : (
        <section
          className="dashboard-links-section"
          aria-labelledby="owned-links-title"
        >
          <header className="dashboard-links-toolbar">
            <div>
              <h2 id="owned-links-title">{text.yours}</h2>
              <p>
                {text.showing} {rangeStart}–{rangeEnd} {i18n.common.of} {data.total}
              </p>
            </div>
            <label>
              {i18n.common.rowsPerPage}
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
            caption={text.caption}
            className="dashboard-links-table"
          >
            <thead>
              <tr>
                <th scope="col">{i18n.common.link}</th>
                <th scope="col">{i18n.common.status}</th>
                <th scope="col">{i18n.common.expiration}</th>
                <th scope="col">{i18n.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((link) => (
                <tr key={link.id}>
                  <td data-label={i18n.common.link}>
                    <div className="dashboard-link-details">
                      <strong>{link.title ?? i18n.common.untitledLink}</strong>
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
                        className="dashboard-destination-url"
                        title={link.destinationUrl}
                        aria-label={link.destinationUrl}
                      >
                        {link.destinationUrl}
                      </span>
                    </div>
                  </td>
                  <td data-label={i18n.common.status}>
                    <LinkStatusBadge link={link} />
                  </td>
                  <td data-label={i18n.common.expiration}>
                    <span className="dashboard-expiration">
                      {link.expiresAt ? (
                        <time
                          dateTime={link.expiresAt}
                          title={formatFullDateTime(link.expiresAt)}
                        >
                          {formatDateTime(link.expiresAt)}
                        </time>
                      ) : (
                        i18n.common.never
                      )}
                    </span>
                  </td>
                  <td data-label={i18n.common.actions}>
                    <div className="dashboard-link-actions">
                      {displayedStatus(link) === 'Active' && (
                        <>
                          <a
                            className="button button--quiet"
                            href={publicShortUrl(link.shortCode)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={text.visitShort}
                            title={text.visitShort}
                          >
                            <DashboardIcon name="external" />
                            <span className="dashboard-action-label">{i18n.common.visit}
                            </span>
                          </a>
                          <Button
                            variant="quiet"
                            aria-live="polite"
                            aria-label={
                              copiedId === link.id
                                ? text.shortCopied
                                : text.copyShort
                            }
                            title={text.copyShort}
                            onClick={() => void copy(link)}
                          >
                            <DashboardIcon name="copy" />
                            <span className="dashboard-action-label">
                              {copiedId === link.id ? i18n.common.copied : i18n.common.copy}
                            </span>
                          </Button>
                          <Button
                            variant="quiet"
                            aria-label={text.qrAction}
                            title={text.qrAction}
                            onClick={() => void openQr(link)}
                          >
                            <DashboardIcon name="qr" />
                            <span className="dashboard-action-label">QR</span>
                          </Button>
                        </>
                      )}
                      <Button
                        variant="quiet"
                        aria-label={text.editLink}
                        title={text.editLink}
                        onClick={() => {
                          setUrlError('');
                          setExpirationError('');
                          setPageError('');
                          setOriginalExpiration(link.expiresAt);
                          setEditing(link);
                        }}
                      >
                        <DashboardIcon name="edit" />
                        <span className="dashboard-action-label">{i18n.common.edit}</span>
                      </Button>
                      {displayedStatus(link) !== 'Expired' &&
                        (displayedStatus(link) === 'Active' ? (
                          <Button
                            variant="secondary"
                            loading={busy === link.id}
                            aria-label={text.disableLink}
                            title={text.disableLink}
                            onClick={() =>
                              setConfirmation({ kind: 'deactivate', link })
                            }
                          >
                            <DashboardIcon name="power" />
                            <span className="dashboard-action-label">{i18n.common.disable}
                            </span>
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            loading={busy === link.id}
                            aria-label={text.enableLink}
                            title={text.enableLink}
                            onClick={() =>
                              void mutate(
                                link.id,
                                () => setOwnedLinkActive(link.id, true),
                                text.enabled,
                              )
                            }
                          >
                            <DashboardIcon name="power" />
                            <span className="dashboard-action-label">{i18n.common.enable}
                            </span>
                          </Button>
                        ))}
                      <Button
                        variant="danger"
                        loading={busy === link.id}
                        aria-label={text.deleteLink}
                        title={text.deleteLink}
                        onClick={() =>
                          setConfirmation({ kind: 'delete', link })
                        }
                      >
                        <DashboardIcon name="trash" />
                        <span className="dashboard-action-label">{i18n.common.delete}</span>
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
          title={text.editLink}
          description={text.editDescription}
        >
          <form className="dashboard-edit-form" onSubmit={saveEdit} noValidate>
            <Input
              label={text.destination}
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
              label={text.title}
              maxLength={200}
              value={editing.title ?? ''}
              onChange={(event) =>
                setEditing({ ...editing, title: event.target.value })
              }
            />
            <Input
              label={text.expires}
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
                {text.saveChanges}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                {i18n.common.cancel}
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
            confirmation.kind === 'delete' ? text.deleteQuestion : text.disableQuestion
          }
          description={
            confirmation.kind === 'delete'
              ? text.deleteDescription
              : text.disableDescription
          }
        >
          <div className="dashboard-confirm-actions">
            <Button
              variant={confirmation.kind === 'delete' ? 'danger' : 'primary'}
              onClick={() => void confirmAction()}
            >
              {confirmation.kind === 'delete' ? text.deleteLink : text.disableLink}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmation(null)}>
              {i18n.common.cancel}
            </Button>
          </div>
        </Dialog>
      )}
      {qrLink && (
        <Dialog
          open
          onClose={clearQr}
          title={text.downloadQr}
          description={`${text.qrDescription} ${publicShortUrl(qrLink.shortCode)}.`}
        >
          <div className="dashboard-qr-dialog">
            <div className="dashboard-qr-preview">
              {qrBusy ? (
                <DashboardLoading label={text.loadingQr} variant="cards" />
              ) : qrError ? (
                <DashboardError
                  message={qrError}
                  retry={() => void openQr(qrLink)}
                />
              ) : (
                qrSource && (
                  <img
                    src={qrSource}
                    alt={`${text.qrAlt} ${publicShortUrl(qrLink.shortCode)}`}
                  />
                )
              )}
            </div>
            <div className="dashboard-qr-copy">
              <strong>{qrLink.title ?? i18n.common.untitledLink}</strong>
              <span>{publicShortUrl(qrLink.shortCode)}</span>
              {qrSource && (
                <a
                  className="button button--primary"
                  href={qrSource}
                  download={`ushly-${qrLink.shortCode}.svg`}
                >
                  <DashboardIcon name="download" />
                  {text.downloadSvg}
                </a>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
