import { useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import FormModal from './components/FormModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import OwnerPanel from './components/OwnerPanel';
import { APP_MODES, isVestHostname, resolveAppMode } from './constants/appModes';
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
 */
export default function App() {
  const { route, navigate, closeLayer } = useJournalRoute();
  const appMode = resolveAppMode(route.app);
  const journal = usePublishedVisits();
  const [owner, setOwner] = useState(false);
  const [contributor, setContributor] = useState(false);
  const [showOwner, setShowOwner] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [blockingUi, setBlockingUi] = useState(false);
  const [darkMode, toggleDarkMode] = useDarkMode();
  const toastBag = useToast();

  useEffect(() => {
    ownerRequest().then((session) => { setOwner(session.owner); setContributor(Boolean(session.contributor)); }).catch(() => { setOwner(false); setContributor(false); });
    const signIn = () => { setOwner(false); setContributor(false); setShowOwner(true); };
    window.addEventListener('vg:sign-in-required', signIn);
    return () => window.removeEventListener('vg:sign-in-required', signIn);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      // An open dialog owns the keyboard. Coffee-only keys live in the journal shell.
      if (showOwner || showShortcuts || blockingUi) return;
      if (e.key === '?') setShowShortcuts((prev) => !prev);
      else if (e.key.toLowerCase() === 'd') toggleDarkMode();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showOwner, showShortcuts, blockingUi, toggleDarkMode]);

  const chrome = {
    isVestDomain,
    darkMode,
    toggleDarkMode,
    owner,
    contributor,
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
            className={`toast ${toastBag.toast.type === 'error' ? 'toast-error' : 'toast-success'}`}
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

      {showOwner && <FormModal topmost title={owner ? 'Manage journal' : contributor ? 'Signed in' : 'Sign in'} onClose={() => setShowOwner(false)}>
        <OwnerPanel owner={owner} contributor={contributor} onSignedIn={(session) => { setOwner(Boolean(session?.owner)); setContributor(Boolean(session?.contributor)); setShowOwner(false); toastBag.show('Signed in.'); }} onSignedOut={() => { setOwner(false); setContributor(false); setShowOwner(false); }} onRestored={(visit) => { journal.setVisits((items) => [visit, ...items]); toastBag.show('Visit restored.'); }} />
      </FormModal>}
    </ErrorBoundary>
  );
}
