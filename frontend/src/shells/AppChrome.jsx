import { APP_MODES, MODE_LABELS, productSwitchHref } from '../constants/appModes';

/**
 * Shared page chrome: brand, dark mode, optional header actions, and the footer
 * that switches products and opens owner sign-in.
 * Vest mode uses its own masthead. The coffee journal keeps the paper brand.
 */
export default function AppChrome({
  appMode,
  isVestDomain,
  darkMode,
  toggleDarkMode,
  headerActions = null,
  showFooter = true,
  owner,
  contributor,
  onOwner,
  onBrand,
  showBrand = true,
  children,
}) {
  const vest = appMode === APP_MODES.VEST;
  const brandHref = isVestDomain ? '/' : vest ? '/?app=vest' : '/';
  const onBrandClick = (event) => { event.preventDefault(); onBrand(); };

  if (vest) {
    return (
      <div className="vest-program min-h-screen">
        <a className="skip-link" href="#vest-dashboard">Skip to vest tracker</a>
        <header className="vp-mast safe-top">
          <div className="vp-wrap vp-mast-row">
            {showBrand ? (
              <a className="vp-brand" href={brandHref} onClick={onBrandClick}>
                <p className="vp-kicker">Wisconsin</p>
                <h1>Vest</h1>
              </a>
            ) : <span />}
            <div className="vp-mast-actions">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="vp-icon-btn"
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
        </header>
        {children}
        {showFooter && (
          <footer className="vp-foot">
            <div className="vp-wrap">
              <p>Wisconsin outfit log.</p>
              <div className="vp-foot-links">
                <a href={productSwitchHref(APP_MODES.VIBES)}>{MODE_LABELS[APP_MODES.VIBES].outcome} ↗</a>
                <button type="button" onClick={onOwner}>{owner ? 'Manage journal' : contributor ? 'Signed in' : 'Sign in'}</button>
              </div>
            </div>
          </footer>
        )}
      </div>
    );
  }

  return (
    <div className="coffee-journal-page min-h-screen transition-colors duration-200">
      <a className="skip-link" href="#journal-main">Skip to journal</a>
      <header className="journal-chrome safe-top transition-colors duration-200">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${showBrand ? 'py-4 sm:py-6 lg:py-8' : 'py-3 sm:py-4'}`}>
          <div className="flex items-center justify-between gap-3 min-w-0">
            {showBrand ? (
              <a className="journal-brand" href={brandHref} onClick={onBrandClick}>
                <h1>vibes & grinds</h1>
              </a>
            ) : <span />}
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
        <footer className="mt-16 py-10 text-center">
          <p className="text-ink-soft text-sm">AJ Harrison’s coffee journal</p>
          <div className="footer-links">
            <a href={productSwitchHref(APP_MODES.VEST)}>{MODE_LABELS[APP_MODES.VEST].outcome} ↗</a>
            <button type="button" onClick={onOwner}>{owner ? 'Manage journal' : contributor ? 'Signed in' : 'Sign in'}</button>
          </div>
        </footer>
      )}
    </div>
  );
}
