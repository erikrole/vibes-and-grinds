import { cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

export default function FormModal({ title, onClose, children, active = true, topmost = false }) {
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [closing, setClosing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const close = useCallback(() => {
    setClosing(true);
    // Let the exit animation finish before unmounting, but never fire twice.
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200);
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (dirty) { setConfirmDiscard(true); return; }
    close();
  }, [saving, dirty, close]);

  useFocusTrap(modalRef, { onEscape: handleClose, enabled: active && !confirmDiscard, initialFocusRef: closeRef });
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return (
    <div className="dialog-shell" style={topmost ? { zIndex: 1010 } : undefined} role="dialog" aria-modal="true" aria-label={title}>
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
          <div className="dialog-body p-4 sm:p-7 md:p-9">{cloneElement(children, { onDirtyChange: setDirty, onSavingChange: setSaving })}</div>
          {confirmDiscard && <DiscardPrompt onKeep={() => setConfirmDiscard(false)} onDiscard={close} />}
        </div>
      </div>
    </div>
  );
}

function DiscardPrompt({ onKeep, onDiscard }) {
  const ref = useRef(null);
  const keepRef = useRef(null);
  useFocusTrap(ref, { onEscape: onKeep, initialFocusRef: keepRef });
  return <div className="discard-overlay"><div ref={ref} className="discard-panel" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-copy">
    <h3 id="discard-title">Discard this entry?</h3>
    <p id="discard-copy">You have unsaved changes. Keep editing to finish your visit.</p>
    <div><button ref={keepRef} type="button" className="btn-primary" onClick={onKeep}>Keep editing</button><button type="button" className="btn-secondary" onClick={onDiscard}>Discard changes</button></div>
  </div></div>;
}
