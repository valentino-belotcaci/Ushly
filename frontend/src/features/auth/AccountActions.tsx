import { useRef, useState, type FormEvent } from 'react';
import { apiSession, ApiClientError } from '../../api/session';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Input } from '../../components/Input';
import { useToast } from '../../components/toast-context';

export function AccountActions({ onAction }: { onAction: () => void }) {
  const notify = useToast();
  const [linkOpen, setLinkOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const pending = useRef(false);

  async function linkGoogle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
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
    popup.opener = null;
    pending.current = true;
    setLinkBusy(true);
    setError('');
    setStatus('');
    try {
      const authorizationUrl = await apiSession.beginGoogleLink(password);
      setPassword('');
      popup.location.assign(authorizationUrl);
      popup.focus();
      setStatus(
        'Finish linking in the Google window. After confirmation, you can sign in with either method.',
      );
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
      notify('You have logged out.', 'success');
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
      <Button
        variant="quiet"
        onClick={() => {
          onAction();
          setError('');
          setStatus('');
          setLinkOpen(true);
        }}
      >
        Link Google
      </Button>
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
            disabled={linkBusy}
          />
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          {status && <p role="status">{status}</p>}
          <Button type="submit" loading={linkBusy}>
            Verify and link Google
          </Button>
        </form>
      </Dialog>
    </>
  );
}
