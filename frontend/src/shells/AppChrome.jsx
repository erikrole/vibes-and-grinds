import { useEffect, useRef, useState } from 'react';
import {
  APP_MODES,
  MODE_LABELS,
  enterAppMode,
  getSiblingProductUrl,
  isVestHostname,
} from '../constants/appModes';

/**
 * Shared page chrome: mode entry, dark toggle, optional header actions, footer.
 * Coffee: secondary Modes control (brand lives in the journal hero / body).
 * Vest: scoreboard-first brand; menu uses --vt tokens (no cream paper).
 */
export default function AppChrome({
  appMode,
  setAppMode,
  darkMode,
  toggleDarkMode,
  headerActions = null,
  showFooter = true,
  /** When true (coffee default after #50), brand is not the mode trigger. */
  compactModeControl = true,
  children,
}) {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeMenuRef = useRef(null);
  const modeTriggerRef = useRef(null);
  const isVest = appMode === APP_MODES.VEST;
  const vestHostLocked = isVestHostname();
  const labels = MODE_LABELS[appMode] || MODE_LABELS[APP_MODES.VIBES];
  const vestEntryUrl = getSiblingProductUrl(APP_MODES.VEST);
  const coffeeEntryUrl = getSiblingProductUrl(APP_MODES.VIBES);

  useEffect(() => {
    if (!showModeMenu) return;

    const closeMenu = (event) => {
      if (event.key === 'Escape') {
        setShowModeMenu(false);
        modeTriggerRef.current?.focus();
      }
    };
    const closeOnOutsideClick = (event) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target)) {
        setShowModeMenu(false);
      }
    };

    document.addEventListener('keydown', closeMenu);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeMenu);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [showModeMenu]);

  useEffect(() => {
    document.title = isVest ? 'Vest Tracker' : 'Vibes & Grinds';
    document.documentElement.dataset.appMode = appMode;
    return () => {
      delete document.documentElement.dataset.appMode;
    };
  }, [appMode, isVest]);

  const selectMode = (mode) => {
    setShowModeMenu(false);
    enterAppMode(mode, { setAppMode });
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isVest ? 'vest-tracker-page' : ''}`}>
      <header
        className={`safe-top transition-colors duration-200 ${
          isVest ? 'vest-tracker-header' : 'journal-chrome'
        }`}
      >
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${
            isVest ? 'py-4 sm:py-6 lg:py-8' : 'py-3 sm:py-4'
          }`}
        >
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="relative flex-1 min-w-0" ref={modeMenuRef}>
              {isVest ? (
                <button
                  ref={modeTriggerRef}
                  type="button"
                  onClick={() => setShowModeMenu((prev) => !prev)}
                  className="mode-brand mode-brand--vest"
                  aria-label={`${labels.brand} — switch mode`}
                  aria-expanded={showModeMenu}
                  aria-haspopup="menu"
                >
                  <span className="brand-mark" aria-hidden="true">VT</span>
                  <h1 className="mode-brand__title coffee-shop-name">{labels.brand}</h1>
                  <svg className="mode-brand__chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" />
                  </svg>
                </button>
              ) : compactModeControl ? (
                <button
                  ref={modeTriggerRef}
                  type="button"
                  onClick={() => setShowModeMenu((prev) => !prev)}
                  className="mode-control"
                  aria-label="Switch mode — open Vest Tracker or stay in coffee journal"
                  aria-expanded={showModeMenu}
                  aria-haspopup="menu"
                >
                  <span className="mode-control__label">Modes</span>
                  <svg className="mode-control__chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" />
                  </svg>
                </button>
              ) : (
                <button
                  ref={modeTriggerRef}
                  type="button"
                  onClick={() => setShowModeMenu((prev) => !prev)}
                  className="mode-brand mode-brand--journal"
                  aria-label={`${labels.brand} — switch mode`}
                  aria-expanded={showModeMenu}
                  aria-haspopup="menu"
                >
                  <h1 className="mode-brand__title mode-brand__title--journal">{labels.brand}</h1>
                  <svg className="mode-brand__chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" />
                  </svg>
                </button>
              )}

              {showModeMenu && (
                <div
                  className={`mode-menu ${isVest ? 'mode-menu--vest' : 'mode-menu--journal'}`}
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => selectMode(APP_MODES.VIBES)}
                    role="menuitemradio"
                    aria-checked={appMode === APP_MODES.VIBES && !vestHostLocked}
                    className={`mode-menu__item ${
                      appMode === APP_MODES.VIBES && !vestHostLocked ? 'mode-menu__item--active' : ''
                    }`}
                  >
                    <span className="mode-menu__outcome">{MODE_LABELS[APP_MODES.VIBES].outcome}</span>
                    <span className="mode-menu__hint">
                      {coffeeEntryUrl && vestHostLocked
                        ? `Open ${coffeeEntryUrl.replace(/^https?:\/\//, '').split('/')[0]}`
                        : MODE_LABELS[APP_MODES.VIBES].hint}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectMode(APP_MODES.VEST)}
                    role="menuitemradio"
                    aria-checked={isVest}
                    className={`mode-menu__item ${isVest ? 'mode-menu__item--active' : ''}`}
                  >
                    <span className="mode-menu__outcome">{MODE_LABELS[APP_MODES.VEST].outcome}</span>
                    <span className="mode-menu__hint">
                      {vestEntryUrl && !isVest
                        ? `Open ${vestEntryUrl.replace(/^https?:\/\//, '').split('/')[0]}`
                        : MODE_LABELS[APP_MODES.VEST].hint}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`mode-theme-toggle ${isVest ? 'mode-theme-toggle--vest' : ''}`}
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
        <footer className={`mode-footer ${isVest ? 'mode-footer--vest' : 'mode-footer--journal'}`}>
          {isVest ? (
            <p>Built for charting AJ&apos;s sideline fits and results</p>
          ) : (
            <p>Built for logging AJ Harrison&apos;s road coffee orders</p>
          )}
        </footer>
      )}
    </div>
  );
}
