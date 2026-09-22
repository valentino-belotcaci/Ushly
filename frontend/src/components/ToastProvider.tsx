import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ToastContext } from './toast-context';
import { Button } from './Button';
import type { Tone } from './Badge';
import { uiText } from '../content/en';

type Toast = { id: number; message: string; tone: Tone };
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());
  useEffect(() => () => {
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
  }, []);
  function dismiss(id: number) {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }
  function notify(message: string, tone: Tone = 'neutral', durationMs?: number) {
    const id = nextId.current++;
    // Only callers that request a duration auto-dismiss; errors remain until dismissed.
    setToasts((current) => [...current, { id, message, tone }].slice(-5));
    if (durationMs !== undefined)
      timers.current.set(id, window.setTimeout(() => dismiss(id), durationMs));
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
                onClick={() => dismiss(toast.id)}
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
