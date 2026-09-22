import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiSession, ApiClientError } from '../../api/session';
import { apiOrigin } from '../../config/public';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Input } from '../../components/Input';
import { useToast } from '../../components/toast-context';
import { watchGooglePopup, type GooglePopupResult } from './googlePopup';

export function AccountActions({ onAction, canLinkGoogle }: { onAction: () => void; canLinkGoogle: boolean }) {
  const notify = useToast();
  const [linkOpen, setLinkOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkPending, setLinkPending] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const pending = useRef(false);
  const stopGoogleWatch = useRef<(() => void) | null>(null);

  useEffect(() => () => stopGoogleWatch.current?.(), []);
  useEffect(() => {
    if (status !== 'Google account linked successfully.') return;
    const timer = window.setTimeout(() => {
      setStatus('');
      setLinkOpen(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function finishGoogleLink(result: GooglePopupResult) {
    setLinkPending(false);
    if (result.status === 'closed' || result.status === 'timeout') {
      setError(result.status === 'closed'
        ? 'Google linking was closed before it finished. Please try again.'
        : 'Google linking timed out. Please try again.');
      setStatus('');
      setLinkOpen(true);
      return;
    }
    if (result.status === 'error') {
      setError(result.code === 'oauth_conflict'
        ? 'This Google identity is already connected to another account. No accounts were merged.'
        : 'Google linking could not be completed. Please try again.');
      setStatus('');
      setLinkOpen(true);
      return;
    }
    setLinkBusy(true);
    try {
      const session = await apiSession.refreshAfterOAuth();
      if (session.status !== 'authenticated') throw new Error('Missing session');
      setError('');
      setStatus('Google account linked successfully.');
      notify('Google account linked successfully.', 'success', 3000);
      setLinkOpen(true);
    } catch {
      setStatus('');
      setError('Google linking could not be confirmed. Please log in and try again.');
      setLinkOpen(true);
    } finally {
      setLinkBusy(false);
    }
  }

  async function linkGoogle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || linkPending) return;
    if (!apiOrigin) {
      setError('Google linking is not configured yet. Please try again later.');
      return;
    }
    if (password.length < 1 || password.length > 128) {
      setError('Enter your account password to link Google.');
      return;
    }
    const popup = window.open(
      '',
      'ushly-google-link',
      'popup,width=560,height=720',
    );
    if (!popup) {
      setError('Allow the Google linking window, then try again.');
      return;
    }
    pending.current = true;
    setLinkBusy(true);
    setError('');
    setStatus('');
    try {
      const authorizationUrl = await apiSession.beginGoogleLink(password);
      setPassword('');
      stopGoogleWatch.current = watchGooglePopup(popup, apiOrigin, (result) => {
        stopGoogleWatch.current = null;
        void finishGoogleLink(result);
      });
      setLinkPending(true);
      popup.location.assign(authorizationUrl);
      popup.focus();
      setStatus('Complete linking in the Google window. This page will update automatically.');
    } catch (failure) {
      popup.close();
      setError(
        failure instanceof ApiClientError
          ? failure.message
          : 'Could not start Google linking. Please try again.',
      );
    } finally {
      pending.current = false;
      setLinkBusy(false);
    }
  }

  async function logout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    onAction();
    try {
      await apiSession.logout();
      notify('You have logged out.', 'success', 3000);
    } catch {
      notify(
        'You are signed out here, but the server could not confirm logout. Please try again when connected.',
        'warning',
      );
    } finally {
      setLogoutBusy(false);
    }
  }

  return (
    <>
      {canLinkGoogle && <Button
        variant="quiet"
        onClick={() => {
          onAction();
          setError('');
          setStatus('');
          setLinkOpen(true);
        }}
      >
        Link Google
      </Button>}
      <Button
        variant="secondary"
        loading={logoutBusy}
        onClick={() => void logout()}
      >
        Log out
      </Button>
      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Link Google to your account"
        description="For password accounts, confirm your current password before connecting a Google identity. Your accounts are never merged based only on email."
      >
        <form className="auth-link-form" onSubmit={linkGoogle}>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={linkBusy || linkPending}
          />
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          {status && <p role="status">{status}</p>}
          {linkPending && <Button variant="secondary" onClick={() => {
            stopGoogleWatch.current?.();
            stopGoogleWatch.current = null;
            void finishGoogleLink({ status: 'closed' });
          }}>Cancel Google linking</Button>}
          <Button type="submit" loading={linkBusy} disabled={linkPending}>
            Verify and link Google
          </Button>
        </form>
      </Dialog>
    </>
  );
}
