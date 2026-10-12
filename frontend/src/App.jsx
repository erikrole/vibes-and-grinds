import { useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import FormModal from './components/FormModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import OwnerPanel from './components/OwnerPanel';
import { APP_MODES, enterAppMode, isVestHostname, resolveAppMode } from './constants/appModes';
import useDarkMode from './hooks/useDarkMode';
import useJournalRoute from './hooks/useJournalRoute';
import usePublishedVisits from './hooks/usePublishedVisits';
import useToast from './hooks/useToast';
import CoffeeJournalShell from './shells/CoffeeJournalShell';
import VestShell from './shells/VestShell';
import { ownerRequest } from './utils/api';

const isVestDomain = isVestHostname();

/**
 * Root shell. Mode comes from the vests.* hostname or ?app=vest.
 * Toasts use the toastBag returned by useToast. Owner sign-in stays here so
 * both products share one session, and anonymous writes stay on the API gate.
 * Mode flips prefer coffee.* ↔ vests.* hops; local/dev keeps ?app=vest.
 */
export default function App() {
  const { route, navigate, closeLayer } = useJournalRoute();
  const appMode = resolveAppMode(route.app);
  const journal = usePublishedVisits();
  const [owner, setOwner] = useState(false);
  const [showOwner, setShowOwner] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [blockingUi, setBlockingUi] = useState(false);
  const [darkMode, toggleDarkMode] = useDarkMode();
  const toastBag = useToast();

  const setAppMode = (mode) => {
    navigate({
      app: mode,
      view: 'visits',
      visit: null,
      shop: null,
      season: null,
    });
  };

  useEffect(() => {
    ownerRequest().then((session) => setOwner(session.owner)).catch(() => setOwner(false));
    const signIn = () => { setOwner(false); setShowOwner(true); };
    window.addEventListener('vg:sign-in-required', signIn);
    return () => window.removeEventListener('vg:sign-in-required', signIn);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      // An open dialog owns the keyboard. Coffee-only keys live in the journal shell.
      // Guard blockingUi so `v` does not discard an open visit form.
      if (showOwner || showShortcuts || blockingUi) return;
      if (e.key.toLowerCase() === 'v') {
        const next = appMode === APP_MODES.VIBES ? APP_MODES.VEST : APP_MODES.VIBES;
        enterAppMode(next, { setAppMode });
      } else if (e.key === '?') setShowShortcuts((prev) => !prev);
      else if (e.key.toLowerCase() === 'd') toggleDarkMode();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appMode, showOwner, showShortcuts, blockingUi, toggleDarkMode]);

  const chrome = {
    isVestDomain,
    setAppMode,
    darkMode,
    toggleDarkMode,
    owner,
    onOwner: () => setShowOwner(true),
    onBrand: () => navigate({ view: 'visits', visit: null, shop: null, season: null }),
    showFooter: !journal.loading && !journal.error,
    showToast: toastBag.show,
  };

  return (
    <ErrorBoundary>
      {appMode === APP_MODES.VEST ? (
        <VestShell {...chrome} />
      ) : (
        <CoffeeJournalShell
          {...chrome}
          route={route}
          navigate={navigate}
          closeLayer={closeLayer}
          visits={journal.visits}
          setVisits={journal.setVisits}
          loading={journal.loading}
          error={journal.error}
          loadVisits={journal.loadVisits}
          showOwner={showOwner}
          suspendKeys={showOwner || showShortcuts}
          onBlockingUiChange={setBlockingUi}
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
            <span>{toastBag.toast.onUndo ? 'Moved to deleted visits.' : toastBag.toast.message}</span>
            {toastBag.toast.onUndo && (
              <span className="font-semibold underline underline-offset-2">Undo</span>
            )}
          </div>
        </div>
      )}

      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {showOwner && <FormModal topmost title={owner ? 'Manage journal' : 'Owner sign-in'} onClose={() => setShowOwner(false)}>
        <OwnerPanel owner={owner} onSignedIn={() => { setOwner(true); setShowOwner(false); toastBag.show('Signed in.'); }} onSignedOut={() => { setOwner(false); setShowOwner(false); }} onRestored={(visit) => { journal.setVisits((items) => [visit, ...items]); toastBag.show('Visit restored.'); }} />
      </FormModal>}
    </ErrorBoundary>
  );
}
