import { lazy, Suspense } from 'react';
import AppChrome from './AppChrome';
import { APP_MODES } from '../constants/appModes';

const VestTrackerDashboard = lazy(() => import('../components/VestTrackerDashboard'));

/**
 * Vest Tracker mode container — scoreboard chrome only; no coffee journal hero.
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
      <Suspense
        fallback={
          <div className="vest-tracker flex items-center justify-center py-20 vt-label animate-pulse">
            Loading scoreboard…
          </div>
        }
      >
        <VestTrackerDashboard showToast={showToast} />
      </Suspense>
    </AppChrome>
  );
}
