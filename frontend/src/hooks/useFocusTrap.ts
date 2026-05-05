import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface FocusTrapOptions {
  onEscape?: () => void;
  enabled?: boolean;
}

export default function useFocusTrap(
  ref: RefObject<HTMLElement>,
  { onEscape, enabled = true }: FocusTrapOptions = {}
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = ref.current;
      if (!container) return;

      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      previouslyFocused?.focus?.();
    };
  }, [ref, onEscape, enabled]);
}
