import { useTheme } from '../theme/theme-context';
import { uiText } from '../content/en';
import { Button } from './Button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="secondary"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      {theme === 'dark' ? uiText.lightTheme : uiText.darkTheme}
    </Button>
  );
}
