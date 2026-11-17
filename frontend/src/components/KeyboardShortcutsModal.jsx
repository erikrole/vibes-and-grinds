import { useEffect, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

const SHORTCUTS = [
  { keys: ['/', '\u2318K'], label: 'Focus search' },
  { keys: ['N'], label: 'New visit' },
  { keys: ['D'], label: 'Toggle dark mode' },
  { keys: ['\u2190', '\u2192'], label: 'Navigate between visits (in detail view)' },
  { keys: ['Esc'], label: 'Close modal or menu' },
  { keys: ['?'], label: 'Show this help' },
];

export default function KeyboardShortcutsModal({ onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useFocusTrap(dialogRef, { onEscape: onClose, initialFocusRef: closeRef });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 animate-backdrop-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
        tabIndex={-1}
        className="animate-modal-in bg-surface-raised rounded-xl shadow-xl max-w-sm w-full border border-rule overflow-hidden outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h3 id="keyboard-shortcuts-title" className="text-lg font-bold text-ink">Keyboard Shortcuts</h3>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="text-ink-soft hover:text-ink transition-colors p-1"
            aria-label="Close keyboard shortcuts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-6 space-y-3">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink-soft">{shortcut.label}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-ink-soft bg-surface-muted border border-rule rounded-md min-w-[28px] justify-center"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
