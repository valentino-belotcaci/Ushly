export type Theme = 'dark' | 'light';
export const themeStorageKey = 'ushly.theme';

export function parseTheme(value: unknown): Theme {
  return value === 'light' ? 'light' : 'dark';
}

export function readTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(themeStorageKey));
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#121212' : '#f7f8fa');
  document
    .getElementById('favicon')
    ?.setAttribute('href', `/favicon-32x32-${theme}.png`);
  document
    .getElementById('apple-icon')
    ?.setAttribute('href', `/favicon-180x180-${theme}.png`);
  document
    .getElementById('app-manifest')
    ?.setAttribute('href', `/manifest-${theme}.webmanifest`);
}
