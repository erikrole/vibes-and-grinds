import { useCallback, useEffect, useState } from 'react';

export default function useToast(duration = 2500) {
  const [toast, setToast] = useState(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setExiting(false);

    const exitTimer = setTimeout(() => setExiting(true), duration - 300);
    const removeTimer = setTimeout(() => {
      setToast(null);
      setExiting(false);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast, duration]);

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  return { toast, exiting, show };
}
