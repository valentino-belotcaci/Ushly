import { useState, type FormEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Input } from '../../components/Input';
import { useToast } from '../../components/toast-context';
import { ApiClientError } from '../../api/session';
import {
  createOwnedLink,
  deleteOwnedLink,
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

export function LinksPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useOwnedLinks(page, 10);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState('');
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState<OwnedLink | null>(null);
  const notify = useToast();
  const message = (failure: unknown) =>
    failure instanceof ApiClientError
      ? failure.message
      : 'The link could not be updated. Please try again.';

  async function create(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy('create');
    setFormError('');
    try {
      await createOwnedLink({
        url: url.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
      });
      setUrl('');
      setTitle('');
      if (page === 1) await reload();
      else setPage(1);
      notify('Link created successfully.', 'success', 3000);
    } catch (failure) {
      setFormError(message(failure));
    } finally {
      setBusy('');
    }
  }
  async function mutate(
    id: string,
    action: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(id);
    setFormError('');
    try {
      await action();
      await reload();
      notify(success, 'success', 3000);
      return true;
    } catch (failure) {
      setFormError(message(failure));
      return false;
    } finally {
      setBusy('');
    }
  }
  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const saved = await mutate(
      editing.id,
      () =>
        updateOwnedLink(editing.id, {
          url: editing.destinationUrl,
          title: editing.title?.trim() || null,
          expiresAt: editing.expiresAt,
        }),
      'Link updated successfully.',
    );
    if (saved) setEditing(null);
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-eyebrow">Manage</p>
          <h1>Links</h1>
          <p>Create and control the short links owned by your account.</p>
        </div>
      </header>
      <form className="card dashboard-create-form" onSubmit={create}>
        <Input
          label="Destination URL"
          type="url"
          required
          maxLength={2048}
          placeholder="https://example.com/long-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={Boolean(busy)}
        />
        <Input
          label="Title (optional)"
          maxLength={200}
          placeholder="Campaign link"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={Boolean(busy)}
        />
        <Button type="submit" loading={busy === 'create'}>
          Shorten link
        </Button>
      </form>
      {formError && !editing && (
        <p className="dashboard-inline-error" role="alert">
          {formError}
        </p>
      )}
      {loading ? (
        <DashboardLoading label="Loading your links…" />
      ) : error ? (
        <DashboardError message={error} retry={() => void reload()} />
      ) : !data?.items.length ? (
        <DashboardEmpty
          title="No owned links"
          text="Links you create while signed in will appear here."
        />
      ) : (
        <section className="dashboard-link-list" aria-label="Owned links">
          {data.items.map((link) => (
            <article className="card dashboard-link-card" key={link.id}>
              <div className="dashboard-link-main">
                <div className="row">
                  <h2>{link.title ?? 'Untitled link'}</h2>
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
                </div>
                <a
                  className="dashboard-short-url"
                  href={publicShortUrl(link.shortCode)}
                  target="_blank"
                  rel="noreferrer"
                >
                  /{link.shortCode}
                </a>
                <p title={link.destinationUrl}>{link.destinationUrl}</p>
                <small>
                  Created {new Date(link.createdAt).toLocaleDateString()}
                </small>
              </div>
              <div className="dashboard-link-actions">
                <a
                  className="button button--quiet"
                  href={publicShortUrl(link.shortCode)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <DashboardIcon name="external" />
                  Visit
                </a>
                <Button variant="quiet" onClick={() => setEditing(link)}>
                  <DashboardIcon name="edit" />
                  Edit
                </Button>
                {link.status !== 'expired' && (
                  <Button
                    variant="secondary"
                    loading={busy === link.id}
                    onClick={() =>
                      void mutate(
                        link.id,
                        () =>
                          setOwnedLinkActive(link.id, link.status !== 'active'),
                        link.status === 'active'
                          ? 'Link deactivated.'
                          : 'Link activated.',
                      )
                    }
                  >
                    <DashboardIcon name="power" />
                    {link.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
                <Button
                  variant="danger"
                  loading={busy === link.id}
                  onClick={() => {
                    if (window.confirm('Delete this link permanently?'))
                      void mutate(
                        link.id,
                        () => deleteOwnedLink(link.id),
                        'Link deleted.',
                      );
                  }}
                >
                  <DashboardIcon name="trash" />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {data && data.total > data.pageSize && (
        <nav className="dashboard-pagination" aria-label="Link pages">
          <Button
            variant="secondary"
            disabled={page === 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button
            variant="secondary"
            disabled={page >= Math.ceil(data.total / data.pageSize) || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </nav>
      )}
      {editing && (
        <Dialog
          open
          onClose={() => setEditing(null)}
          title="Edit link"
          description="Update the destination, title, or future expiration for this owned link."
        >
          <form className="dashboard-edit-form" onSubmit={saveEdit}>
            <Input
              label="Destination URL"
              type="url"
              required
              maxLength={2048}
              value={editing.destinationUrl}
              onChange={(e) =>
                setEditing({ ...editing, destinationUrl: e.target.value })
              }
            />
            <Input
              label="Title"
              maxLength={200}
              value={editing.title ?? ''}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
            />
            <Input
              label="Expires at"
              type="datetime-local"
              value={editing.expiresAt ? editing.expiresAt.slice(0, 16) : ''}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  expiresAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
            {formError && (
              <p className="dashboard-inline-error" role="alert">
                {formError}
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
    </div>
  );
}
