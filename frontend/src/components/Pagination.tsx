import { Button } from './Button';
import { uiText } from '../content/en';

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const last = Number.isFinite(pageCount)
    ? Math.max(1, Math.trunc(pageCount))
    : 1;
  const current = Number.isFinite(page)
    ? Math.min(last, Math.max(1, Math.trunc(page)))
    : 1;
  return (
    <nav className="pagination" aria-label={uiText.pagination}>
      <Button
        variant="secondary"
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
      >
        {uiText.previous}
      </Button>
      <span aria-live="polite" aria-atomic="true">
        Page {current} of {last}
      </span>
      <Button
        variant="secondary"
        disabled={current >= last}
        onClick={() => onPageChange(current + 1)}
      >
        {uiText.next}
      </Button>
    </nav>
  );
}
