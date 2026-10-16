import { useEffect, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

const SHORTCUTS = [
  { keys: ['/', '\u2318K'], label: 'Focus search' },
  { keys: ['N'], label: 'New visit' },
  { keys: ['V'], label: 'Toggle Vibes / Vest mode' },
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
    const onKey = (event) => {
      if (event.key === '?') {
        event.preventDefault();
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
        className="animate-modal-in bg-white dark:bg-stone-800 rounded-xl shadow-xl max-w-sm w-full border border-stone-200/60 dark:border-stone-600/60 overflow-hidden outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h3 id="keyboard-shortcuts-title" className="text-lg font-bold text-stone-900 dark:text-stone-50">Keyboard Shortcuts</h3>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors p-1"
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
              <span className="text-sm text-stone-600 dark:text-stone-300">{shortcut.label}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-stone-800 dark:text-stone-100 bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-md min-w-[28px] justify-center"
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
