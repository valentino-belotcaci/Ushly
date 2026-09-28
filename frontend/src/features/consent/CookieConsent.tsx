import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import './cookie-consent.css';
import { translations } from '../../i18n';
import { useLocale } from '../../i18n/locale';
import { localizedPath } from '../../i18n/locale';

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
  const locale = useLocale();
  const translation = translations(locale);
  const t = translation.consent;
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
        <section className="cookie-banner" aria-label={t.label}>
          <button
            className="cookie-banner__close"
            type="button"
            aria-label={t.closeBanner}
            onClick={() => setBannerDismissed(true)}
          >
            <span aria-hidden="true">×</span>
          </button>
          <div>
            <strong>{t.title}</strong>
            <p>
              {t.text}{' '}<Link to={localizedPath('/cookie-policy', locale)}>{translation.layout.cookies}</Link>{' '}
              {t.and}{' '}<Link to={localizedPath('/privacy-policy', locale)}>{translation.layout.privacy}</Link>,{' '}
              {t.plus}{' '}<Link to={localizedPath('/terms-of-service', locale)}>{translation.layout.terms}</Link>.
            </p>
          </div>
          <div className="cookie-banner__actions">
            <button
              className="button cookie-banner__button--outline"
              onClick={() => setSettingsOpen(true)}
            >
              {t.manage}
            </button>
            <button
              className="button cookie-banner__button--outline"
              onClick={() => save(false, false)}
            >
              {t.reject}
            </button>
            <button
              className="button button--primary"
              onClick={() => save(true, true)}
            >
              {t.accept}
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
            <p className="cookie-dialog__eyebrow">{t.controls}</p>
            <h2 id="cookie-settings-title">{t.settings}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label={t.closeSettings}
            onClick={() => setSettingsOpen(false)}
          >
            ×
          </button>
        </div>
        <p>
          {t.explanation}
        </p>
        <div className="cookie-dialog__option">
          <div>
            <strong>{t.essential}</strong>
            <span>{t.essentialText}</span>
          </div>
          <span aria-label={t.always}>{t.always}</span>
        </div>
        <label className="cookie-dialog__option">
          <span>
            <strong>{t.analytics}</strong>
            <span>{t.futureProvider}</span>
          </span>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
          />
        </label>
        <label className="cookie-dialog__option">
          <span>
            <strong>{t.advertising}</strong>
            <span>{t.futureProvider}</span>
          </span>
          <input
            type="checkbox"
            checked={advertising}
            onChange={(event) => setAdvertising(event.target.checked)}
          />
        </label>
        <div className="cookie-dialog__actions">
          <Link to={localizedPath('/cookie-policy', locale)} onClick={() => setSettingsOpen(false)}>
            {translation.layout.cookies}
          </Link>
          <button
            className="button button--primary"
            onClick={() => save(analytics, advertising)}
          >
            {t.save}
          </button>
        </div>
      </dialog>
    </>
  );
}
