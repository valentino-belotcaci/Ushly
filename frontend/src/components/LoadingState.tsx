import { uiText } from '../content/en';
export function LoadingState({ label = uiText.loading }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
