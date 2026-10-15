import { useEffect } from 'react';
import { APP_MODES } from '../appMode';

export default function useJournalShortcuts({
  appMode,
  showForm,
  viewingVisit,
  editingVisit,
  toggleDarkMode,
  searchRef,
  setAppMode,
  setShowShortcuts,
  openNewVisit,
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ctrl+K / Cmd+K: focus search (works even from input fields)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (appMode === APP_MODES.VIBES) searchRef.current?.focus();
        return;
      }

      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

      // An open dialog owns the keyboard. The tag guard above only covers text
      // fields, so with focus on a button inside the visit form a stray `v`
      // switched app modes — unmounting the form and discarding the draft.
      if (showForm || editingVisit || viewingVisit) return;

      if (e.key.toLowerCase() === 'v') {
        setAppMode((prev) => {
          return prev === APP_MODES.VIBES ? APP_MODES.VEST : APP_MODES.VIBES;
        });
      } else if (e.key === '/' && appMode === APP_MODES.VIBES) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === '?') {
        setShowShortcuts((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n' && appMode === APP_MODES.VIBES) {
        openNewVisit();
      } else if (e.key.toLowerCase() === 'd') {
        toggleDarkMode();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appMode, showForm, viewingVisit, editingVisit, toggleDarkMode]);
}
