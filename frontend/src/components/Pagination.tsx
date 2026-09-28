import { Button } from './Button';
import { translations } from '../i18n';
import { useLocale } from '../i18n/locale';

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const text = translations(useLocale()).common;
  const last = Number.isFinite(pageCount)
    ? Math.max(1, Math.trunc(pageCount))
    : 1;
  const current = Number.isFinite(page)
    ? Math.min(last, Math.max(1, Math.trunc(page)))
    : 1;
  return (
    <nav className="pagination" aria-label={text.pagination}>
      <Button
        variant="secondary"
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
      >
        {text.previous}
      </Button>
      <span aria-live="polite" aria-atomic="true">
        {text.page} {current} {text.of} {last}
      </span>
      <Button
        variant="secondary"
        disabled={current >= last}
        onClick={() => onPageChange(current + 1)}
      >
        {text.next}
      </Button>
    </nav>
  );
}
