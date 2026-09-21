import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { ThemeContext } from './theme-context';
import {
  applyTheme,
  parseTheme,
  readTheme,
  themeStorageKey,
  type Theme,
} from './theme';

const subscribeToHydration = () => () => {};
const clientSnapshot = () => false;
const serverSnapshot = () => true;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, updateTheme] = useState(readTheme);
  // Match the dark server markup on the hydration pass, then show the saved preference.
  const hydrating = useSyncExternalStore(
    subscribeToHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const theme = hydrating ? 'dark' : preference;

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
