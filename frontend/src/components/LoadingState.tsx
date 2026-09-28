import { uiText } from '../content/en';

export type LoadingStateVariant =
  | 'page'
  | 'cards'
  | 'table'
  | 'list'
  | 'overview'
  | 'links'
  | 'analytics'
  | 'admin';

function Line({ size = 'medium' }: { size?: 'short' | 'medium' | 'long' }) {
  return <span className={`loading-skeleton__line is-${size}`} />;
}

function Rows({ count, columns = 1 }: { count: number; columns?: number }) {
  return (
    <div className="loading-skeleton__rows">
      {Array.from({ length: count }, (_, row) => (
        <div className="loading-skeleton__row" data-columns={columns} key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <Line
              size={
                column === 0
                  ? 'long'
                  : column === columns - 1
                    ? 'short'
                    : 'medium'
              }
              key={column}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonLayout({ variant }: { variant: LoadingStateVariant }) {
  if (variant === 'page') {
    return (
      <div
        className="loading-skeleton loading-skeleton--page"
        aria-hidden="true"
      >
        <div className="loading-skeleton__masthead">
          <Line size="short" />
          <Line size="medium" />
        </div>
        <div className="loading-skeleton__hero-copy">
          <Line size="short" />
          <Line size="long" />
          <Line size="long" />
          <Line size="medium" />
          <span className="loading-skeleton__button" />
        </div>
        <div className="loading-skeleton__hero-card">
          <Line size="medium" />
          <span className="loading-skeleton__control" />
          <span className="loading-skeleton__button" />
        </div>
      </div>
    );
  }

  if (variant === 'overview') {
    return (
      <div
        className="loading-skeleton loading-skeleton--overview"
        aria-hidden="true"
      >
        <div className="loading-skeleton__page-heading">
          <Line size="short" />
          <Line size="medium" />
        </div>
        <div className="loading-skeleton__metrics">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="loading-skeleton__metric" key={index}>
              <span className="loading-skeleton__icon" />
              <div>
                <Line size="medium" />
                <Line size="short" />
              </div>
            </div>
          ))}
        </div>
        <div className="loading-skeleton__panel">
          <div className="loading-skeleton__panel-heading">
            <div>
              <Line size="short" />
              <Line size="medium" />
            </div>
            <Line size="short" />
          </div>
          <Rows count={4} columns={2} />
        </div>
      </div>
    );
  }

  if (variant === 'links') {
    return (
      <div
        className="loading-skeleton loading-skeleton--links"
        aria-hidden="true"
      >
        <div className="loading-skeleton__toolbar">
          <div>
            <Line size="short" />
            <Line size="medium" />
          </div>
          <span className="loading-skeleton__select" />
        </div>
        <div className="loading-skeleton__table-heading">
          {Array.from({ length: 4 }, (_, index) => (
            <Line size={index === 0 ? 'long' : 'short'} key={index} />
          ))}
        </div>
        <Rows count={5} columns={4} />
        <div className="loading-skeleton__pagination">
          <span className="loading-skeleton__button" />
          <Line size="short" />
          <span className="loading-skeleton__button" />
        </div>
      </div>
    );
  }

  if (variant === 'analytics') {
    return (
      <div
        className="loading-skeleton loading-skeleton--analytics"
        aria-hidden="true"
      >
        <div className="loading-skeleton__filters">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <Line size="short" />
              <span className="loading-skeleton__control" />
            </div>
          ))}
          <span className="loading-skeleton__button" />
        </div>
        <div className="loading-skeleton__metrics">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="loading-skeleton__metric" key={index}>
              <Line size="medium" />
              <Line size="short" />
            </div>
          ))}
        </div>
        <div className="loading-skeleton__analytics-grid">
          {Array.from({ length: 2 }, (_, index) => (
            <div className="loading-skeleton__panel" key={index}>
              <div className="loading-skeleton__panel-heading">
                <Line size="medium" />
              </div>
              <Rows count={4} columns={2} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'admin') {
    return (
      <div
        className="loading-skeleton loading-skeleton--admin"
        aria-hidden="true"
      >
        <div className="loading-skeleton__filters">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <Line size="short" />
              <span className="loading-skeleton__control" />
            </div>
          ))}
        </div>
        <div className="loading-skeleton__table-heading">
          {Array.from({ length: 5 }, (_, index) => (
            <Line size={index === 0 ? 'long' : 'short'} key={index} />
          ))}
        </div>
        <Rows count={6} columns={5} />
        <div className="loading-skeleton__pagination">
          <span className="loading-skeleton__button" />
          <Line size="short" />
          <span className="loading-skeleton__button" />
        </div>
      </div>
    );
  }

  const itemCount = variant === 'cards' ? 3 : 4;
  return (
    <div
      className={`loading-skeleton loading-skeleton--${variant}`}
      aria-hidden="true"
    >
      {Array.from({ length: itemCount }, (_, index) => (
        <div className="loading-skeleton__item" key={index}>
          <Line size="medium" />
          <Line size="long" />
        </div>
      ))}
    </div>
  );
}

export function LoadingState({
  label = uiText.loading,
  variant = 'page',
}: {
  label?: string;
  variant?: LoadingStateVariant;
}) {
  return (
    <div
      className={`loading-state loading-state--${variant}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="loading-state__label">
        <span className="spinner" aria-hidden="true" />
        <span>{label}</span>
      </span>
      <SkeletonLayout variant={variant} />
    </div>
  );
}
