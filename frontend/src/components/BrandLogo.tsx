import darkLogo from '../assets/brand/ushly-logo-dark.svg';
import lightLogo from '../assets/brand/ushly-logo-light.svg';
import { useTheme } from '../theme/theme-context';

export function BrandLogo() {
  const { theme } = useTheme();
  return (
    <span className="brand">
      <img
        src={theme === 'dark' ? darkLogo : lightLogo}
        alt=""
        width="36"
        height="36"
      />
      <span>Ushly</span>
    </span>
  );
}
