import { lazy, Suspense } from 'react';
import { APP_MODES } from '../constants/appModes';
import AppChrome from './AppChrome';

const VestTrackerDashboard = lazy(() => import('../components/VestTrackerDashboard'));

/** Vest Tracker screen. The dashboard keeps its own games; edits stay owner-gated. */
export default function VestShell({
  isVestDomain,
  darkMode,
  toggleDarkMode,
  owner,
  onOwner,
  onBrand,
  showFooter,
  showToast,
}) {
  return (
    <AppChrome
      appMode={APP_MODES.VEST}
      isVestDomain={isVestDomain}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      owner={owner}
      onOwner={onOwner}
      onBrand={onBrand}
      showFooter={showFooter}
    >
      <Suspense fallback={<div className="flex items-center justify-center py-20 text-ink-faint animate-pulse">Loading...</div>}>
        <VestTrackerDashboard showToast={showToast} canEdit={owner} />
      </Suspense>
    </AppChrome>
  );
}
