import { APP_MODES } from '../constants/appModes';

/**
 * Shared page chrome: dark mode, optional header actions, and the footer
 * that switches products and opens owner sign-in.
 * Coffee brand lives in CoffeeJournalHero; Vest keeps brand in this header.
 */
export default function AppChrome({
  appMode,
  isVestDomain,
  darkMode,
  toggleDarkMode,
  headerActions = null,
  showFooter = true,
  owner,
  onOwner,
  onBrand,
  children,
}) {
  const vest = appMode === APP_MODES.VEST;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${vest ? 'vest-tracker-page' : 'coffee-journal-page'}`}>
      <header className={`safe-top transition-colors duration-200 ${vest ? 'vest-tracker-header' : 'journal-chrome'}`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${vest ? 'py-4 sm:py-6 lg:py-8' : 'py-3 sm:py-4'}`}>
          <div className="flex items-center justify-between gap-3 min-w-0">
            {vest ? (
              <a
                className="journal-brand"
                href={isVestDomain ? '/' : '/?app=vest'}
                onClick={(event) => { event.preventDefault(); onBrand(); }}
              >
                <h1>Vest Tracker</h1>
              </a>
            ) : (
              <p className="mode-control__label text-ink-soft" aria-hidden="true">
                Journal
              </p>
            )}

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl text-ink-soft hover:bg-surface-muted transition-colors"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {headerActions}
            </div>
          </div>
        </div>
      </header>

      {children}

      {showFooter && (
        <footer className={`mt-16 py-10 text-center transition-colors ${
          vest ? 'border-t border-rule text-ink-soft text-sm' : ''
        }`}>
          {vest ? (
            <p>Built for charting AJ's sideline fits and results</p>
          ) : (
            <p className="text-ink-soft text-sm">
              AJ Harrison’s coffee journal
            </p>
          )}
          <div className="footer-links">
            <a href={vest ? (isVestDomain ? 'https://coffee.erikrole.com/' : '/') : '/?app=vest'}>
              {vest ? 'Coffee journal ↗' : 'Vest Tracker ↗'}
            </a>
            <button type="button" onClick={onOwner}>{owner ? 'Manage journal' : 'Owner sign-in'}</button>
          </div>
        </footer>
      )}
    </div>
  );
}
