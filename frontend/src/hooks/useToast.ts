import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  message: string;
  type: ToastType;
  duration?: number;
  onUndo?: () => void | Promise<void>;
}

interface UseToastResult {
  toast: Toast | null;
  exiting: boolean;
  show: (message: string, type?: ToastType, options?: Partial<Toast>) => void;
  dismiss: () => void;
}

export default function useToast(duration = 2500): UseToastResult {
  const [toast, setToast] = useState<Toast | null>(null);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!toast) return;
    setExiting(false);

    const d = toast.duration || duration;
    exitTimerRef.current = setTimeout(() => setExiting(true), d - 300);
    removeTimerRef.current = setTimeout(() => {
      setToast(null);
      setExiting(false);
    }, d);

    return clearTimers;
  }, [toast, duration, clearTimers]);

  const show = useCallback<UseToastResult['show']>((message, type = 'success', options = {}) => {
    setToast({ message, type, ...options });
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setExiting(true);
    setTimeout(() => {
      setToast(null);
      setExiting(false);
    }, 200);
  }, [clearTimers]);

  return { toast, exiting, show, dismiss };
}
