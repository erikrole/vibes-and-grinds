import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function useFocusTrap(ref, { onEscape, enabled = true, initialFocusRef } = {}) {
  // Callers rebuild onEscape whenever their own state changes (VisitDetailModal
  // rebuilds it on every menu toggle). Holding it in a ref keeps the effect from
  // tearing down and re-running, which would restore focus to the element behind
  // the modal and then yank it back — visible as a focus jump mid-interaction.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  const initialFocusTargetRef = useRef(initialFocusRef);
  initialFocusTargetRef.current = initialFocusRef;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onEscapeRef.current?.();
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
      (initialFocusTargetRef.current?.current || ref.current?.querySelector(FOCUSABLE))?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      previouslyFocused?.focus?.();
    };
  }, [ref, enabled]);
}
