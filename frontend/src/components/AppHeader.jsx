import { useEffect, useRef, useState } from 'react';
import { APP_MODES } from '../appMode';

export default function AppHeader({
  appMode,
  setAppMode,
  darkMode,
  toggleDarkMode,
  showAddVisit,
  onAddVisit,
}) {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeMenuRef = useRef(null);
  const modeTriggerRef = useRef(null);
  const modeListRef = useRef(null);
  const modeLabel = appMode === APP_MODES.VEST ? 'VEST TRACKER' : 'VIBES & GRINDS';

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
    if (!showModeMenu) return;
    modeListRef.current?.querySelector('[aria-checked="true"]')?.focus();
  }, [showModeMenu]);

  return (
    <header className={`safe-top transition-colors duration-200 ${
      appMode === APP_MODES.VEST
        ? 'vest-tracker-header'
        : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="relative flex-1 min-w-0" ref={modeMenuRef}>
            <button
              ref={modeTriggerRef}
              type="button"
              onClick={() => setShowModeMenu((prev) => !prev)}
              className="flex max-w-full items-center gap-2 sm:gap-4 text-left hover:opacity-80 transition-opacity min-w-0"
              aria-label={`${appMode === APP_MODES.VIBES ? 'vibes & grinds' : modeLabel} — toggle app mode`}
              aria-expanded={showModeMenu}
              aria-haspopup="menu"
              aria-controls="app-mode-menu"
            >
              {appMode === APP_MODES.VEST && <span className="brand-mark" aria-hidden="true">VT</span>}
              <h1 className={`text-xl sm:text-3xl leading-none ${
                appMode === APP_MODES.VEST
                  ? 'coffee-shop-name font-black tracking-tight'
                  : ''
              }`}
                style={appMode === APP_MODES.VIBES ? {
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontWeight: 600,
                  letterSpacing: '0',
                  color: 'var(--ink)',
                } : undefined}
              >
                {appMode === APP_MODES.VIBES ? 'vibes & grinds' : modeLabel}
              </h1>
              <svg className="w-4 h-4 shrink-0 text-[color:var(--ink-soft)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" />
              </svg>
            </button>

            {showModeMenu && (
              <div
                id="app-mode-menu"
                ref={modeListRef}
                className="absolute left-0 mt-2 w-56 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-lg z-20 overflow-hidden"
                role="menu"
                aria-label="App mode"
                onKeyDown={(event) => {
                  const items = [...event.currentTarget.querySelectorAll('[role="menuitemradio"]')];
                  const current = items.indexOf(document.activeElement);
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const delta = event.key === 'ArrowDown' ? 1 : -1;
                    const next = current === -1 ? 0 : (current + delta + items.length) % items.length;
                    items[next]?.focus();
                  } else if (event.key === 'Home') {
                    event.preventDefault();
                    items[0]?.focus();
                  } else if (event.key === 'End') {
                    event.preventDefault();
                    items[items.length - 1]?.focus();
                  } else if (event.key === 'Tab') {
                    setShowModeMenu(false);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowModeMenu(false);
                    setAppMode(APP_MODES.VIBES);
                  }}
                  role="menuitemradio"
                  aria-checked={appMode === APP_MODES.VIBES}
                  className={`w-full text-left px-4 py-3.5 text-sm ${
                    appMode === APP_MODES.VIBES
                      ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
                  }`}
                >
                  Vibes & Grinds
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModeMenu(false);
                    setAppMode(APP_MODES.VEST);
                  }}
                  role="menuitemradio"
                  aria-checked={appMode === APP_MODES.VEST}
                  className={`w-full text-left px-4 py-3.5 text-sm ${
                    appMode === APP_MODES.VEST
                      ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
                  }`}
                >
                  Vest Tracker
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
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
            {showAddVisit && (
              <>
                <button onClick={onAddVisit} className="btn-primary hidden sm:block">Add Visit</button>
                <button onClick={onAddVisit} className="header-icon-button sm:hidden" aria-label="Add Visit">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
