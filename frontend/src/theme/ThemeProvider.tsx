import { useEffect, useState, type ReactNode } from 'react';
import { ThemeContext } from './theme-context';
import {
  applyTheme,
  parseTheme,
  readTheme,
  themeStorageKey,
  type Theme,
} from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState(readTheme);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === themeStorageKey || event.key === null)
        updateTheme(parseTheme(event.newValue));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function setTheme(next: Theme) {
    updateTheme(next);
    try {
      localStorage.setItem(themeStorageKey, next);
    } catch {
      // A blocked/quota-limited store must not prevent switching in this tab.
    }
  }
  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}
