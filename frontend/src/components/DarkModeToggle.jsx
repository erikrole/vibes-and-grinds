import { useState } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

export default function DarkModeToggle() {
  const { mode, setMode } = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);

  const modes = [
    { value: 'auto', label: 'Auto', icon: '○' },
    { value: 'light', label: 'Light', icon: '☀' },
    { value: 'dark', label: 'Dark', icon: '☾' },
  ];

  const currentMode = modes.find(m => m.value === mode);

  return (
    <div className="fixed bottom-5 left-5 z-40">
      <div className="relative">
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-all"
          aria-label="Toggle dark mode"
        >
          <span className="text-lg">{currentMode.icon}</span>
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
            {currentMode.label}
          </span>
          <svg
            className={`w-4 h-4 text-stone-500 dark:text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div className="absolute bottom-full left-0 mb-2 w-40 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl z-20 overflow-hidden">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setMode(m.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    mode === m.value
                      ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-50'
                      : 'text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50'
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span className="font-medium">{m.label}</span>
                  {mode === m.value && (
                    <svg className="w-4 h-4 ml-auto text-stone-900 dark:text-stone-50" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
