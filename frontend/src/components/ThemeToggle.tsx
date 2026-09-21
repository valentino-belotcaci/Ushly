import { useEffect, useId, useState } from 'react';
import { useTheme } from '../theme/theme-context';
import { uiText } from '../content/en';
import { Button } from './Button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = useId();
  const label = theme === 'dark' ? uiText.lightTheme : uiText.darkTheme;
  useEffect(() => {
    if (!showTooltip) return;
    // Hovered tooltips must also dismiss with Escape when the button isn't focused.
    function dismiss(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowTooltip(false);
    }
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [showTooltip]);
  return (
    <span
      className="theme-toggle"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Button
        variant="secondary"
        className="theme-toggle__button"
        aria-label={label}
        aria-describedby={showTooltip ? tooltipId : undefined}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {theme === 'dark' ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
            </>
          ) : (
            <path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z" />
          )}
        </svg>
      </Button>
      <span
        id={tooltipId}
        role="tooltip"
        className="theme-toggle__tooltip"
        hidden={!showTooltip}
      >
        {label}
      </span>
    </span>
  );
}
