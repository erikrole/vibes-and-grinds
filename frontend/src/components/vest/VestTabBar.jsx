const TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'game-stats', label: 'Game Stats' },
  { value: 'rankings', label: 'NET Rankings' },
];

export default function VestTabBar({ value, onChange }) {
  return (
    <div className="mb-5 sm:mb-6 flex rounded-xl border border-stone-300 dark:border-stone-600 overflow-hidden">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium transition-colors border-r last:border-r-0 border-stone-300 dark:border-stone-600 ${
            value === tab.value
              ? 'bg-stone-800 dark:bg-stone-700 text-stone-50'
              : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
          }`}
          aria-pressed={value === tab.value}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
