import { lazy, Suspense } from 'react';
import AppChrome from './AppChrome';
import { APP_MODES } from '../constants/appModes';

const VestTrackerDashboard = lazy(() => import('../components/VestTrackerDashboard'));

/**
 * Vest Tracker mode container. Owns Vest layout mounting; dashboard keeps its own data/state.
 */
export default function VestShell({
  setAppMode,
  darkMode,
  toggleDarkMode,
  showToast,
}) {
  return (
    <AppChrome
      appMode={APP_MODES.VEST}
      setAppMode={setAppMode}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      showFooter
    >
      <Suspense fallback={<div className="flex items-center justify-center py-20 text-ink-faint animate-pulse">Loading...</div>}>
        <VestTrackerDashboard showToast={showToast} />
      </Suspense>
    </AppChrome>
  );
}
