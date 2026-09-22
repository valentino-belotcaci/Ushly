import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import './cookie-consent.css';

const STORAGE_KEY = 'ushly.cookie-consent';
const CONSENT_VERSION = 1;

type Consent = {
  version: typeof CONSENT_VERSION;
  analytics: boolean;
  advertising: boolean;
  updatedAt: string;
};

function readConsent(): Consent | null {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    );
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      parsed.version === CONSENT_VERSION &&
      'analytics' in parsed &&
      typeof parsed.analytics === 'boolean' &&
      'advertising' in parsed &&
      typeof parsed.advertising === 'boolean' &&
      'updatedAt' in parsed &&
      typeof parsed.updatedAt === 'string'
    ) {
      return {
        version: CONSENT_VERSION,
        analytics: parsed.analytics,
        advertising: parsed.advertising,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    // Unavailable or malformed storage should show the choice again safely.
  }
  return null;
}

function storeConsent(analytics: boolean, advertising: boolean) {
  const preference: Consent = {
    version: CONSENT_VERSION,
    analytics,
    advertising,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Essential functionality remains available when preference storage fails.
  }
}

export function CookieConsent() {
  const [ready, setReady] = useState(false);
  const [hasChoice, setHasChoice] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const current = readConsent();
      setHasChoice(Boolean(current));
      setAnalytics(current?.analytics ?? false);
      setAdvertising(current?.advertising ?? false);
      setReady(true);
    });
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener('ushly:open-cookie-settings', openSettings);
    return () => {
      active = false;
      window.removeEventListener('ushly:open-cookie-settings', openSettings);
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (settingsOpen && !element.open) element.showModal();
    if (!settingsOpen && element.open) element.close();
  }, [settingsOpen]);

  function save(nextAnalytics: boolean, nextAdvertising: boolean) {
    storeConsent(nextAnalytics, nextAdvertising);
    setAnalytics(nextAnalytics);
    setAdvertising(nextAdvertising);
    setHasChoice(true);
    setSettingsOpen(false);
  }

  if (!ready) return null;
  return (
    <>
      {!hasChoice && !bannerDismissed && (
        <section className="cookie-banner" aria-label="Cookie consent">
          <button
            className="cookie-banner__close"
            type="button"
            aria-label="Close cookie banner"
            onClick={() => setBannerDismissed(true)}
          >
            <span aria-hidden="true">×</span>
          </button>
          <div>
            <strong>Your privacy choices</strong>
            <p>
              Ushly uses essential cookies for secure sessions. Optional
              analytics and advertising tools are not currently loaded. Read our{' '}
              <Link to="/cookies">Cookie Policy</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>, plus the{' '}
              <Link to="/terms">Terms of Service</Link>.
            </p>
          </div>
          <div className="cookie-banner__actions">
            <button
              className="button cookie-banner__button--outline"
              onClick={() => setSettingsOpen(true)}
            >
              Manage preferences
            </button>
            <button
              className="button cookie-banner__button--outline"
              onClick={() => save(false, false)}
            >
              Reject non-essential
            </button>
            <button
              className="button button--primary"
              onClick={() => save(true, true)}
            >
              Accept all
            </button>
          </div>
        </section>
      )}
      <dialog
        ref={dialog}
        className="cookie-dialog"
        aria-labelledby="cookie-settings-title"
        onCancel={() => setSettingsOpen(false)}
        onClose={() => setSettingsOpen(false)}
      >
        <div className="cookie-dialog__header">
          <div>
            <p className="cookie-dialog__eyebrow">Privacy controls</p>
            <h2 id="cookie-settings-title">Cookie settings</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close cookie settings"
            onClick={() => setSettingsOpen(false)}
          >
            ×
          </button>
        </div>
        <p>
          Essential session cookies always remain available. No optional tool is
          currently implemented or loaded.
        </p>
        <div className="cookie-dialog__option">
          <div>
            <strong>Essential</strong>
            <span>Authentication and session security</span>
          </div>
          <span aria-label="Always active">Always active</span>
        </div>
        <label className="cookie-dialog__option">
          <span>
            <strong>Optional analytics</strong>
            <span>Reserved for a future disclosed provider</span>
          </span>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
          />
        </label>
        <label className="cookie-dialog__option">
          <span>
            <strong>Advertising</strong>
            <span>Reserved for a future disclosed provider</span>
          </span>
          <input
            type="checkbox"
            checked={advertising}
            onChange={(event) => setAdvertising(event.target.checked)}
          />
        </label>
        <div className="cookie-dialog__actions">
          <Link to="/cookies" onClick={() => setSettingsOpen(false)}>
            Cookie Policy
          </Link>
          <button
            className="button button--primary"
            onClick={() => save(analytics, advertising)}
          >
            Save preferences
          </button>
        </div>
      </dialog>
    </>
  );
}
