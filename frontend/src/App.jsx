import { useCallback, useEffect, useState } from 'react';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { APP_MODES, isVestHostname } from './constants/appModes';
import useDarkMode from './hooks/useDarkMode';
import useLocalStorage from './hooks/useLocalStorage';
import useToast from './hooks/useToast';
import CoffeeJournalShell from './shells/CoffeeJournalShell';
import VestShell from './shells/VestShell';

const isVestDomain = isVestHostname();

/**
 * Root shell: mode selection, shared prefs key, dark mode, toasts, and cross-mode shortcuts.
 * Feature UI lives in CoffeeJournalShell / VestShell so the two products can grow apart.
 */
export default function App() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [blockingUi, setBlockingUi] = useState(false);
  const [darkMode, toggleDarkMode] = useDarkMode();
  const toastBag = useToast();
  const [viewPrefs, setViewPrefs] = useLocalStorage('vibes-and-grinds:view-preferences', {
    sortBy: 'date',
    searchQuery: '',
    sportFilter: '',
    repeatFilter: '',
    scopeFilter: '',
    appMode: isVestDomain ? APP_MODES.VEST : APP_MODES.VIBES,
  });

  const appMode = isVestDomain
    ? APP_MODES.VEST
    : (viewPrefs.appMode || APP_MODES.VIBES);

  const setAppMode = (v) => setViewPrefs((p) => ({
    ...p,
    appMode: typeof v === 'function' ? v(p.appMode) : v,
  }));

  const onBlockingUiChange = useCallback((open) => {
    setBlockingUi(Boolean(open));
  }, []);

  // Cross-mode keyboard shortcuts (coffee-only keys live in CoffeeJournalShell)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

      // An open dialog owns the keyboard — don't toggle mode and discard a draft.
      if (blockingUi) return;

      if (e.key.toLowerCase() === 'v') {
        setAppMode((prev) => (prev === APP_MODES.VIBES ? APP_MODES.VEST : APP_MODES.VIBES));
      } else if (e.key === '?') {
        setShowShortcuts((prev) => !prev);
      } else if (e.key.toLowerCase() === 'd') {
        toggleDarkMode();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [blockingUi, toggleDarkMode]);

  const chromeProps = {
    setAppMode,
    darkMode,
    toggleDarkMode,
  };

  return (
    <ErrorBoundary>
      {appMode === APP_MODES.VEST ? (
        <VestShell {...chromeProps} showToast={toastBag.show} />
      ) : (
        <CoffeeJournalShell
          {...chromeProps}
          viewPrefs={viewPrefs}
          setViewPrefs={setViewPrefs}
          showToast={toastBag.show}
          onBlockingUiChange={onBlockingUiChange}
        />
      )}

      {toastBag.toast && (
        <div
          className={`fixed top-4 right-4 z-[1004] ${toastBag.exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
          onClick={() => {
            if (toastBag.toast.onUndo) {
              toastBag.toast.onUndo();
              toastBag.dismiss();
            } else {
              toastBag.dismiss();
            }
          }}
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm cursor-pointer select-none transition-opacity hover:opacity-80 ${
              toastBag.toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200'
            }`}
          >
            <span>{toastBag.toast.onUndo ? 'Visit deleted.' : toastBag.toast.message}</span>
            {toastBag.toast.onUndo && (
              <span className="font-semibold underline underline-offset-2">Undo</span>
            )}
          </div>
        </div>
      )}

      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </ErrorBoundary>
  );
}
