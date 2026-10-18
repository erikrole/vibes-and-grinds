import { useCallback, useEffect, useRef, useState } from 'react';

function writeStored(key, value) {
  try {
    const next = JSON.stringify(value);
    if (localStorage.getItem(key) !== next) localStorage.setItem(key, next);
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const valueRef = useRef(value);
  valueRef.current = value;

  // Search updates this on every keystroke. Wait briefly so typing does not
  // rewrite storage, and flush if the tab closes before the timer fires.
  useEffect(() => {
    const timer = setTimeout(() => writeStored(key, value), 300);
    return () => clearTimeout(timer);
  }, [key, value]);

  useEffect(() => {
    const flush = () => writeStored(key, valueRef.current);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [key]);

  const remove = useCallback(() => {
    localStorage.removeItem(key);
    setValue(initialValue);
  }, [key, initialValue]);

  return [value, setValue, remove];
}
