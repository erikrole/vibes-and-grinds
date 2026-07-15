import { useCallback, useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

export default function FormModal({ title, onClose, children }) {
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useFocusTrap(modalRef, { onEscape: handleClose, initialFocusRef: closeRef });

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
          <button
            ref={closeRef}
            onClick={handleClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-10 h-10 flex items-center justify-center rounded-md bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
            aria-label={`Close ${title}`}
          >
            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="dialog-body p-4 sm:p-7 md:p-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
