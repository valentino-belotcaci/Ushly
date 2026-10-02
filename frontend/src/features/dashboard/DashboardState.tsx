import type { ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  LoadingState,
  type LoadingStateVariant,
} from '../../components/LoadingState';
import { translations } from '../../i18n';
import { useLocale } from '../../i18n/locale';

export function DashboardLoading({
  label,
  variant = 'page',
}: {
  label?: string;
  variant?: LoadingStateVariant;
}) {
  const text = translations(useLocale()).dashboard;
  return (
    <div className={`dashboard-state dashboard-state--loading-${variant} card`}>
      <LoadingState label={label ?? text.loadingWorkspace} variant={variant} />
    </div>
  );
}
export function DashboardError({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  const text = translations(useLocale()).dashboard;
  return (
    <div className="dashboard-state card" role="alert">
      <strong>{text.loadError}</strong>
      <p>{message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          {text.tryAgain}
        </Button>
      )}
    </div>
  );
}
export function DashboardEmpty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="dashboard-state card">
      <span className="dashboard-empty-mark" aria-hidden="true">
        ↗
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
