import { useCallback, useEffect, useRef, useState } from 'react';

export default function useToast(duration = 2500) {
  const [toast, setToast] = useState(null);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef(null);
  const removeTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(exitTimerRef.current);
    clearTimeout(removeTimerRef.current);
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

  const show = useCallback((message, type = 'success', options = {}) => {
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
