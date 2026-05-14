import { useCallback, useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

export default function FormModal({ title, onClose, children }) {
  const modalRef = useRef(null);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useFocusTrap(modalRef, { onEscape: handleClose });

  return (
    <div className="fixed inset-0 z-[1001] overflow-hidden sm:overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={handleClose}
      />
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
        <div
          ref={modalRef}
          className={`${closing ? 'animate-modal-out' : 'animate-modal-in'} relative h-[100dvh] max-h-[100dvh] w-full overflow-y-auto overscroll-contain border-0 bg-white shadow-2xl dark:bg-stone-800 sm:h-auto sm:max-h-[85vh] sm:max-w-xl sm:rounded-3xl sm:border sm:border-stone-200/60 sm:dark:border-stone-600/60`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all"
            aria-label={`Close ${title}`}
          >
            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="min-h-full p-4 pb-0 sm:min-h-0 sm:p-5 md:p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
