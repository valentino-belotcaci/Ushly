import { Button } from './Button';
import { uiText } from '../content/en';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state">
      <div role="alert">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {uiText.retry}
        </Button>
      )}
    </div>
  );
}
