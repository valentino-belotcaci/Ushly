import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Link } from 'react-router';
import { apiOrigin } from '../../config/public';
import { apiSession, ApiClientError, useSession } from '../../api/session';
import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemeToggle } from '../../components/ThemeToggle';
import './auth.css';

type Mode = 'login' | 'register';
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function validate(
  email: string,
  password: string,
  confirm: string,
  mode: Mode,
) {
  const normalized = email.trim();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    return { field: 'email', message: 'Enter a valid email address.' } as const;
  if (password.length < (mode === 'register' ? 8 : 1) || password.length > 128)
    return {
      field: 'password',
      message:
        mode === 'register'
          ? 'Use a password between 8 and 128 characters.'
          : 'Enter your password.',
    } as const;
  if (mode === 'register' && password !== confirm)
    return { field: 'confirm', message: 'Passwords do not match.' } as const;
  return null;
}

export function AuthPage({ mode }: { mode: Mode }) {
  const ready = useSyncExternalStore(
    subscribeToHydration,
    clientReady,
    serverReady,
  );
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<{
    field: 'email' | 'password' | 'confirm';
    message: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [registered, setRegistered] = useState(false);
  const pending = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmInput = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    setConflict(false);
    const invalid = validate(email, password, confirm, mode);
    setFieldError(invalid);
    if (invalid) {
      ({
        email: emailInput,
        password: passwordInput,
        confirm: confirmInput,
      })[invalid.field].current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      if (mode === 'register') {
        await apiSession.register({ email: email.trim(), password });
        setRegistered(true);
        setPassword('');
        setConfirm('');
      } else {
        await apiSession.login({ email: email.trim(), password });
        setPassword('');
      }
    } catch (failure) {
      if (
        failure instanceof ApiClientError &&
        failure.code === 'oauth_conflict'
      )
        setConflict(true);
      else
        setError(
          failure instanceof ApiClientError
            ? failure.message
            : 'Something went wrong. Please try again.',
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function startGoogle() {
    if (googlePending) return;
    if (!apiOrigin) {
      setError('Google sign-in is not configured yet. Please try again later.');
      return;
    }
    const popup = window.open(
      `${apiOrigin}/auth/google`,
      'ushly-google-auth',
      'popup,width=560,height=720',
    );
    if (!popup) {
      setError('Allow the Google sign-in window, then try again.');
      return;
    }
    popup.opener = null;
    setError('');
    setConflict(false);
    setGooglePending(true);
    popup.focus();
  }

  async function finishGoogle() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const restored = await apiSession.restore();
      if (restored.status !== 'authenticated') setConflict(true);
      else setGooglePending(false);
    } catch (failure) {
      setError(
        failure instanceof ApiClientError
          ? failure.message
          : 'Google sign-in could not be completed. Please try again.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const title = mode === 'register' ? 'Create an account' : 'Log in to Ushly';
  return (
    <div className="auth-screen">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="auth-topbar">
        <Link to="/" aria-label="Ushly home" className="brand-link">
          <BrandLogo />
        </Link>
        <ThemeToggle />
      </header>
      <main id="main-content" className="auth-main" tabIndex={-1}>
        <section className="auth-panel" aria-labelledby="auth-title">
          <p className="auth-eyebrow">Welcome to Ushly</p>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-intro">
            {mode === 'register'
              ? 'Create an account to manage your links and access their click analytics.'
              : 'Access your account to continue managing your links.'}
          </p>
          {session.status === 'authenticated' ? (
            <div className="auth-success" role="status">
              <strong>You’re signed in.</strong>
              <p>Your session is ready.</p>
              <Link className="button button--primary" to="/">
                Return to Ushly
              </Link>
            </div>
          ) : registered ? (
            <div className="auth-success" role="status">
              <strong>Account created.</strong>
              <p>Log in with your new email and password to continue.</p>
              <Link className="button button--primary" to="/login">
                Log in
              </Link>
            </div>
          ) : (
            <>
              <Button
                variant="secondary"
                className="auth-google"
                onClick={startGoogle}
                disabled={!ready || busy || googlePending}
              >
                <span className="auth-google__mark" aria-hidden="true">
                  G
                </span>
                Continue with Google
              </Button>
              {googlePending && (
                <div className="auth-google-status" role="status">
                  <p>
                    Complete sign-in in the Google window. When it finishes,
                    return here to continue.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => void finishGoogle()}
                    disabled={busy}
                  >
                    I’ve finished with Google
                  </Button>
                </div>
              )}
              <div className="auth-divider">
                <span>or</span>
              </div>
              <noscript>
                Enable JavaScript to submit credentials securely without putting
                them in the page URL.
              </noscript>
              <form onSubmit={submit} noValidate className="auth-form">
                <Input
                  ref={emailInput}
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  {...(fieldError?.field === 'email'
                    ? { error: fieldError.message }
                    : {})}
                  disabled={!ready || busy || googlePending}
                />
                <Input
                  ref={passwordInput}
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === 'register' ? 'new-password' : 'current-password'
                  }
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  {...(fieldError?.field === 'password'
                    ? { error: fieldError.message }
                    : {})}
                  disabled={!ready || busy || googlePending}
                />
                {mode === 'register' && (
                  <Input
                    ref={confirmInput}
                    label="Confirm password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    {...(fieldError?.field === 'confirm'
                      ? { error: fieldError.message }
                      : {})}
                    disabled={!ready || busy || googlePending}
                  />
                )}
                {error && (
                  <p className="auth-error" role="alert">
                    {error}
                  </p>
                )}
                {conflict && (
                  <p className="auth-error" role="alert">
                    This Google identity may belong to an existing account. Log
                    in with your existing method, then choose Link Google in the
                    account header and verify your password. Accounts are never
                    merged based only on email.
                  </p>
                )}
                <Button
                  type="submit"
                  loading={busy}
                  disabled={!ready || googlePending}
                >
                  {mode === 'register' ? 'Create account' : 'Log in'}
                </Button>
              </form>
              {mode === 'register' && (
                <p className="auth-legal">
                  By creating an account, you agree to our{' '}
                  <Link to="/privacy">Privacy Policy</Link> and{' '}
                  <Link to="/terms">Terms of Service</Link>.
                </p>
              )}
              <p className="auth-switch">
                {mode === 'register'
                  ? 'Already have an account? '
                  : 'New to Ushly? '}
                <Link to={mode === 'register' ? '/login' : '/register'}>
                  {mode === 'register' ? 'Log in' : 'Create an account'}
                </Link>
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
