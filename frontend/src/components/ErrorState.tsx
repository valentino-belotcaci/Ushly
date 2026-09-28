import { Button } from './Button';
import { translations } from '../i18n';
import { useLocale } from '../i18n/locale';

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  const text = translations(useLocale()).common;
  return (
    <div className="error-state">
      <div role="alert">
        <h3>{title ?? text.unknownError}</h3>
        <p>{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {text.retry}
        </Button>
      )}
    </div>
  );
}
