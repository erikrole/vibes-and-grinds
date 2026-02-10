import { useState } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function DarkModeToggle() {
  const { mode, setMode } = useDarkMode();
  const [hoveredMode, setHoveredMode] = useState(null);

  const modes = [
    {
      value: 'light',
      label: 'Switch to light theme',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      value: 'auto',
      label: 'Switch to system theme',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      value: 'dark',
      label: 'Switch to dark theme',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    },
  ];

  return (
    <div className="fixed bottom-3 left-3 z-40">
      <div className="relative group">
        {/* Tooltip */}
        {hoveredMode && (
          <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-50 text-xs font-medium rounded-lg shadow-lg whitespace-nowrap border border-stone-200 dark:border-stone-700">
            {modes.find(m => m.value === hoveredMode)?.label}
          </div>
        )}

        {/* Button Group */}
        <div className="flex items-center bg-stone-800 dark:bg-stone-800 rounded-md p-0.5 shadow-lg">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              onMouseEnter={() => setHoveredMode(m.value)}
              onMouseLeave={() => setHoveredMode(null)}
              className={`p-1.5 rounded transition-all ${
                mode === m.value
                  ? 'bg-stone-700 text-stone-50'
                  : 'text-stone-400 hover:text-stone-300 hover:bg-stone-700/50'
              }`}
              aria-label={m.label}
            >
              {m.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
