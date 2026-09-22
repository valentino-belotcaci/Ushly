import { createContext, useContext } from 'react';
import type { Tone } from './Badge';
export const ToastContext = createContext<
  ((message: string, tone?: Tone, durationMs?: number) => void) | null
>(null);
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast requires ToastProvider');
  return context;
}
