import { useRef, useState, type ReactNode } from 'react';
import { ToastContext } from './toast-context';
import { Button } from './Button';
import type { Tone } from './Badge';
import { uiText } from '../content/en';

type Toast = { id: number; message: string; tone: Tone };
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  function notify(message: string, tone: Tone = 'neutral') {
    const id = nextId.current++;
    // Bound the stack; messages stay until dismissed rather than expiring while being read.
    setToasts((current) => [...current, { id, message, tone }].slice(-5));
  }
  return (
    <ToastContext value={notify}>
      {children}
      <div
        className="toast-region"
        role="status"
        aria-live="polite"
        aria-atomic="false"
        aria-label={uiText.notifications}
      >
        <ol className="toast-list">
          {toasts.map((toast) => (
            <li key={toast.id} className={`toast tone-${toast.tone}`}>
              <span>{toast.message}</span>
              <Button
                variant="quiet"
                aria-label={`${uiText.dismiss}: ${toast.message}`}
                onClick={() =>
                  setToasts((current) =>
                    current.filter((item) => item.id !== toast.id),
                  )
                }
              >
                ×
              </Button>
            </li>
          ))}
        </ol>
      </div>
    </ToastContext>
  );
}
