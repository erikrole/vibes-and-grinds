import { useEffect } from 'react';

/**
 * Wires the global app shortcut handler. The caller provides callbacks for
 * each action; the hook decides which action a key event maps to and ignores
 * keystrokes from text inputs (except Cmd/Ctrl+K, which always works).
 *
 *   v / V        → toggleMode()
 *   /            → focusSearch()
 *   Cmd/Ctrl+K   → focusSearch()  (works even from inputs)
 *   ?            → toggleShortcuts()
 *   n / N        → newVisit()        (only when not viewing/editing)
 *   d / D        → toggleDarkMode()
 *
 * Pass `appMode` so we can scope `/` and `n` to vibes mode only.
 */
export default function useAppShortcuts({
  appMode,
  isVibesMode,
  isViewingVisit,
  isEditingVisit,
  focusSearch,
  toggleMode,
  toggleShortcuts,
  toggleDarkMode,
  newVisit,
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isVibesMode) focusSearch?.();
        return;
      }

      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'v') {
        toggleMode?.();
      } else if (e.key === '/' && isVibesMode) {
        e.preventDefault();
        focusSearch?.();
      } else if (e.key === '?') {
        toggleShortcuts?.();
      } else if (key === 'n' && isVibesMode && !isViewingVisit && !isEditingVisit) {
        newVisit?.();
      } else if (key === 'd') {
        toggleDarkMode?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    appMode,
    isVibesMode,
    isViewingVisit,
    isEditingVisit,
    focusSearch,
    toggleMode,
    toggleShortcuts,
    toggleDarkMode,
    newVisit,
  ]);
}
