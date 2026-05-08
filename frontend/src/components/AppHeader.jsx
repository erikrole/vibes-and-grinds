import { useState } from 'react';

export const APP_MODES = {
  VIBES: 'vibes',
  VEST: 'vest',
};

const VIBES_TITLE_STYLE = {
  fontFamily: 'Fraunces, Georgia, serif',
  fontWeight: 600,
  letterSpacing: '-0.03em',
  color: 'var(--ink)',
};

/**
 * Top bar: app-mode dropdown on the left, dark-mode toggle + Add button on
 * the right. The mode menu is hidden when `lockMode` is true (vest subdomain).
 */
export default function AppHeader({
  appMode,
  setAppMode,
  lockMode,
  darkMode,
  toggleDarkMode,
  showAddVisitButton,
  onAddVisit,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isVibes = appMode === APP_MODES.VIBES;
  const modeLabel = isVibes ? 'vibes & grinds' : 'VEST TRACKER';

  return (
    <header
      className={`safe-top transition-colors duration-200 ${
        appMode === APP_MODES.VEST
          ? 'bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700'
          : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="relative min-w-0">
            <button
              onClick={() => !lockMode && setMenuOpen((prev) => !prev)}
              onBlur={() => window.setTimeout(() => setMenuOpen(false), 120)}
              className="flex items-center gap-2 sm:gap-4 text-left hover:opacity-80 transition-opacity min-w-0"
              aria-label={`${modeLabel} — toggle app mode`}
              aria-haspopup={lockMode ? undefined : 'menu'}
              aria-expanded={lockMode ? undefined : menuOpen}
            >
              <div className="text-2xl sm:text-4xl shrink-0">{isVibes ? '☕' : '👔'}</div>
              <h1
                className={`text-xl sm:text-3xl lg:text-5xl truncate leading-[1.15] pb-0.5 ${
                  isVibes ? '' : 'coffee-shop-name font-black tracking-tight'
                }`}
                style={isVibes ? VIBES_TITLE_STYLE : undefined}
              >
                {modeLabel}
              </h1>
              {!lockMode && (
                <svg className="w-4 h-4 text-stone-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" />
                </svg>
              )}
            </button>

            {menuOpen && !lockMode && (
              <div className="absolute left-0 mt-2 w-56 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-lg z-20 overflow-hidden">
                <ModeMenuItem
                  label="☕ VIBES & GRINDS"
                  active={isVibes}
                  onSelect={() => {
                    setMenuOpen(false);
                    setAppMode(APP_MODES.VIBES);
                  }}
                />
                <ModeMenuItem
                  label="👔 VEST TRACKER"
                  active={!isVibes}
                  onSelect={() => {
                    setMenuOpen(false);
                    setAppMode(APP_MODES.VEST);
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
            {showAddVisitButton && (
              <button onClick={onAddVisit} className="btn-primary hidden md:block">
                Add Visit
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ModeMenuItem({ label, active, onSelect }) {
  return (
    <button
      onMouseDown={onSelect}
      className={`w-full text-left px-4 py-3.5 text-sm ${
        active
          ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
      }`}
    >
      {label}
    </button>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}
