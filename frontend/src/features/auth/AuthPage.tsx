import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { apiOrigin } from '../../config/public';
import { apiSession, ApiClientError, useSession } from '../../api/session';
import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useToast } from '../../components/toast-context';
import { watchGooglePopup, type GooglePopupResult } from './googlePopup';
import './auth.css';
import { localizedPath, useLocale } from '../../i18n/locale';
import { translations, type Translation } from '../../i18n';

type Mode = 'login' | 'register';
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function validate(
  email: string,
  password: string,
  confirm: string,
  mode: Mode,
  text: Translation['auth'],
) {
  const normalized = email.trim();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    return { field: 'email', message: text.validEmail } as const;
  if (password.length < (mode === 'register' ? 8 : 1) || password.length > 128)
    return {
      field: 'password',
      message:
        mode === 'register'
          ? text.passwordLength
          : text.enterPassword,
    } as const;
  if (mode === 'register' && password !== confirm)
    return { field: 'confirm', message: text.passwordMismatch } as const;
  return null;
}

export function AuthPage({ mode }: { mode: Mode }) {
  const ready = useSyncExternalStore(
    subscribeToHydration,
    clientReady,
    serverReady,
  );
  const session = useSession();
  const notify = useToast();
  const navigate = useNavigate();
  const locale = useLocale();
  const copy = translations(locale);
  const t = copy.auth;
  const localePrefix = /^\/(?:en|it)(?:\/|$)/.test(useLocation().pathname);
  const route = (path: string) => localizedPath(path, locale, localePrefix);
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
  const pending = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmInput = useRef<HTMLInputElement>(null);
  const stopGoogleWatch = useRef<(() => void) | null>(null);

  useEffect(() => () => stopGoogleWatch.current?.(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    setConflict(false);
    const invalid = validate(email, password, confirm, mode, t);
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
        await apiSession.login({ email: email.trim(), password });
        setPassword('');
        setConfirm('');
        notify(t.accountReady, 'success', 3000);
        navigate(route('/dashboard'), { replace: true });
      } else {
        await apiSession.login({ email: email.trim(), password });
        setPassword('');
        notify(`${t.signedIn} ${t.sessionReady}`, 'success', 3000);
        navigate(route('/dashboard'), { replace: true });
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
            : copy.common.unknownError,
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function startGoogle() {
    if (googlePending) return;
    if (!apiOrigin) {
      setError(t.googleNotConfigured);
      return;
    }
    const popup = window.open(
      '',
      'ushly-google-auth',
      'popup,width=560,height=720',
    );
    if (!popup) {
      setError(t.popupBlocked);
      return;
    }
    setError('');
    setConflict(false);
    setGooglePending(true);
    stopGoogleWatch.current = watchGooglePopup(popup, apiOrigin, (result) => {
      stopGoogleWatch.current = null;
      void finishGoogle(result);
    });
    popup.location.assign(`${apiOrigin}/auth/google`);
    popup.focus();
  }

  async function finishGoogle(result: GooglePopupResult) {
    setGooglePending(false);
    if (result.status === 'closed' || result.status === 'timeout') {
      setError(
        result.status === 'closed'
          ? t.googleClosed
          : t.googleTimeout,
      );
      return;
    }
    if (result.status === 'error') {
      if (result.code === 'oauth_conflict') setConflict(true);
      else setError(t.googleFailed);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const restored = await apiSession.refreshAfterOAuth();
      if (restored.status !== 'authenticated')
        setError(t.googleFailed);
      else {
        notify(`${t.signedIn} ${t.sessionReady}`, 'success', 3000);
        navigate(route('/dashboard'), { replace: true });
      }
    } catch (failure) {
      setError(
        failure instanceof ApiClientError
          ? failure.message
          : t.googleFailed,
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const title = mode === 'register' ? t.registerTitle : t.loginTitle;
  return (
    <div className="auth-screen">
      <a className="skip-link" href="#main-content">
        {copy.layout.skip}
      </a>
      <header className="auth-topbar">
        <Link
          to={route('/')}
          aria-label={copy.layout.home}
          className="brand-link"
        >
          <BrandLogo />
        </Link>
        <div className="auth-topbar__controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>
      <main id="main-content" className="auth-main" tabIndex={-1}>
        <section className="auth-panel" aria-labelledby="auth-title">
          <p className="auth-eyebrow">{t.welcome}</p>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-intro">
            {mode === 'register'
              ? t.registerIntro
              : t.loginIntro}
          </p>
          {session.status === 'authenticated' ? (
            <div className="auth-success">
              <div role="status">
                <strong>{t.signedIn}</strong>
                <p>{t.sessionReady}</p>
              </div>
              <Link
                className="button button--primary"
                to={route('/dashboard')}
              >
                {t.openDashboard}
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
                <span className="auth-google__label">{t.continueGoogle}</span>
              </Button>
              {googlePending && (
                <div className="auth-google-status" role="status">
                  <p>
                    {t.googlePending}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      stopGoogleWatch.current?.();
                      stopGoogleWatch.current = null;
                      void finishGoogle({ status: 'closed' });
                    }}
                  >
                    {t.cancelGoogle}
                  </Button>
                </div>
              )}
              <div className="auth-divider">
                <span>{t.or}</span>
              </div>
              <noscript>
                {t.javascript}
              </noscript>
              <form onSubmit={submit} noValidate className="auth-form">
                <Input
                  ref={emailInput}
                  label={t.email}
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
                  label={t.password}
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
                    label={t.confirmPassword}
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
                    {t.conflict}
                  </p>
                )}
                <Button
                  type="submit"
                  loading={busy}
                  disabled={!ready || googlePending}
                >
                  {mode === 'register' ? t.createAccount : t.login}
                </Button>
              </form>
              {mode === 'register' && (
                <p className="auth-legal">
                  {t.legalPrefix}{' '}
                  <Link to={localePrefix ? route('/privacy-policy') : '/privacy'}>
                    {copy.layout.privacy}
                  </Link>{' '}
                  {t.and}{' '}
                  <Link to={localePrefix ? route('/terms-of-service') : '/terms'}>
                    {copy.layout.terms}
                  </Link>.
                </p>
              )}
              <p className="auth-switch">
                {mode === 'register'
                  ? `${t.already} `
                  : `${t.new} `}
                <Link
                  to={route(mode === 'register' ? '/login' : '/register')}
                >
                  {mode === 'register' ? t.login : t.registerTitle}
                </Link>
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
