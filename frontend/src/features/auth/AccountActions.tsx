import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiSession, ApiClientError } from '../../api/session';
import { apiOrigin } from '../../config/public';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Input } from '../../components/Input';
import { useToast } from '../../components/toast-context';
import { watchGooglePopup, type GooglePopupResult } from './googlePopup';
import { translations } from '../../i18n';
import { useLocale } from '../../i18n/locale';

export function AccountActions({
  onAction,
  canLinkGoogle,
  showLogout = true,
}: {
  onAction: () => void;
  canLinkGoogle: boolean;
  showLogout?: boolean;
}) {
  const notify = useToast();
  const copy = translations(useLocale());
  const layoutText = copy.layout;
  const t = copy.auth;
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
    if (status !== t.linkSuccess) return;
    const timer = window.setTimeout(() => {
      setStatus('');
      setLinkOpen(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [status, t.linkSuccess]);

  async function finishGoogleLink(result: GooglePopupResult) {
    setLinkPending(false);
    if (result.status === 'closed' || result.status === 'timeout') {
      setError(result.status === 'closed'
        ? t.linkClosed
        : t.linkTimeout);
      setStatus('');
      setLinkOpen(true);
      return;
    }
    if (result.status === 'error') {
      setError(result.code === 'oauth_conflict'
        ? t.linkConflict
        : t.linkFailed);
      setStatus('');
      setLinkOpen(true);
      return;
    }
    setLinkBusy(true);
    try {
      const session = await apiSession.refreshAfterOAuth();
      if (session.status !== 'authenticated') throw new Error('Missing session');
      setError('');
      setStatus(t.linkSuccess);
      notify(t.linkSuccess, 'success', 3000);
      setLinkOpen(true);
    } catch {
      setStatus('');
      setError(t.linkConfirmFailed);
      setLinkOpen(true);
    } finally {
      setLinkBusy(false);
    }
  }

  async function linkGoogle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || linkPending) return;
    if (!apiOrigin) {
      setError(t.linkNotConfigured);
      return;
    }
    if (password.length < 1 || password.length > 128) {
      setError(t.linkPassword);
      return;
    }
    const popup = window.open(
      '',
      'ushly-google-link',
      'popup,width=560,height=720',
    );
    if (!popup) {
      setError(t.linkPopup);
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
      setStatus(t.linkPending);
    } catch (failure) {
      popup.close();
      setError(
        failure instanceof ApiClientError
          ? failure.message
          : t.linkStartFailed,
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
      notify(layoutText.loggedOut, 'success', 3000);
    } catch {
      notify(
        layoutText.logoutWarning,
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
        {t.linkGoogle}
      </Button>}
      {showLogout && <Button
        variant="secondary"
        loading={logoutBusy}
        onClick={() => void logout()}
      >
        {layoutText.logout}
      </Button>}
      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title={t.linkTitle}
        description={t.linkDescription}
      >
        <form className="auth-link-form" onSubmit={linkGoogle}>
          <Input
            label={t.currentPassword}
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
          }}>{t.cancelLink}</Button>}
          <Button type="submit" loading={linkBusy} disabled={linkPending}>
            {t.verifyLink}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
