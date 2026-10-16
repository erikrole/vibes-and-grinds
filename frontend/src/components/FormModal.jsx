import { useCallback, useEffect, useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

export default function FormModal({ title, onClose, children }) {
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const handleClose = useCallback(() => {
    setClosing(true);
    // Let the exit animation finish before unmounting, but never fire twice.
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(onClose, 200);
  }, [onClose]);

  useFocusTrap(modalRef, { onEscape: handleClose });

  useEffect(() => {
    const panel = modalRef.current;
    if (!panel) return undefined;

    const focusField = () => {
      const field = panel.querySelector(
        '.dialog-body button, .dialog-body input:not([type="hidden"]), .dialog-body select, .dialog-body textarea'
      );
      if (!field) return false;
      const active = document.activeElement;
      if (active === closeRef.current || active === document.body || active === panel || !panel.contains(active)) {
        field.focus();
      }
      return true;
    };

    const observer = new MutationObserver(() => {
      if (focusField()) observer.disconnect();
    });
    observer.observe(panel, { childList: true, subtree: true });
    focusField();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="dialog-shell" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`dialog-backdrop ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={handleClose}
      />
      <div className="dialog-positioner">
        <div
          ref={modalRef}
          className={`${closing ? 'animate-modal-out' : 'animate-modal-in'} dialog-panel max-w-3xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dialog-body p-4 sm:p-7 md:p-9">{children}</div>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className="dialog-close w-10 h-10 flex items-center justify-center rounded-md bg-stone-100 dark:bg-stone-700 text-[color:var(--ink)] hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
            aria-label={`Close ${title}`}
          >
            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
