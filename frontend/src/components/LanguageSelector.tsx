import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { translations } from '../i18n';
import {
  localizedPath,
  localizedEquivalentPath,
  locales,
  useLocale,
} from '../i18n/locale';
import './language-selector.css';

export function LanguageSelector({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const location = useLocation();
  const locale = useLocale();
  const t = translations(locale);
  const equivalentPath = localizedEquivalentPath(location.pathname);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [open]);

  return (
    <div ref={root} className={`language-selector ${className}`}>
      <button
        ref={trigger}
        type="button"
        className="language-selector__trigger"
        aria-label={t.layout.selectLanguage}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <svg
          className="language-selector__icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21M12 3C9.5 5.5 8.2 8.5 8.2 12S9.5 18.5 12 21" />
        </svg>
        <span>{locale.toUpperCase()}</span>
        <span className="language-selector__chevron" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div id={menuId} className="language-selector__menu" role="menu">
          {locales.map((option) => (
            <Link
              key={option}
              role="menuitem"
              lang={option}
              aria-label={`${translations(option).languageName} (${option.toUpperCase()})`}
              className={option === locale ? 'is-current' : ''}
              aria-current={option === locale ? 'true' : undefined}
              to={`${localizedPath(equivalentPath, option)}${location.search}${location.hash}`}
              onClick={() => setOpen(false)}
            >
              <span>{translations(option).languageName}</span>
              <strong>{option.toUpperCase()}</strong>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
