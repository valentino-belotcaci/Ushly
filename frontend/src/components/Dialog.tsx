import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { translations } from '../i18n';
import { useLocale } from '../i18n/locale';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const text = translations(useLocale()).common;
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // showModal gives us browser focus containment, Escape handling and an inert background.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="dialog__header">
        <h2 id={`${id}-title`}>{title}</h2>
        <Button
          variant="quiet"
          onClick={onClose}
          aria-label={text.closeDialog}
        >
          ×
        </Button>
      </header>
      {description && (
        <p id={`${id}-description`} className="muted">
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}
