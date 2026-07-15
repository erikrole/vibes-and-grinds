import { useEffect } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function useFocusTrap(ref, { onEscape, enabled = true, initialFocusRef } = {}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = ref.current;
      if (!container) return;

      const focusable = container.querySelectorAll(FOCUSABLE);
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

    // Focus the intentional entry point rather than whichever control appears first.
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => {
      (initialFocusRef?.current || ref.current?.querySelector(FOCUSABLE))?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      previouslyFocused?.focus?.();
    };
  }, [ref, onEscape, enabled, initialFocusRef]);
}
