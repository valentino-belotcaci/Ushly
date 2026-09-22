import type { ReactNode } from 'react';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';

export function DashboardLoading({
  label = 'Loading your workspace…',
}: {
  label?: string;
}) {
  return (
    <div className="dashboard-state card">
      <LoadingState label={label} />
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
  return (
    <div className="dashboard-state card" role="alert">
      <strong>We couldn’t load this view.</strong>
      <p>{message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
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
