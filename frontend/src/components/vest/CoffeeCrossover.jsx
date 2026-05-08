export default function CoffeeCrossover({ rows }) {
  if (!rows.length) return null;

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
        Game-Day Coffee
      </h3>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
        Does your coffee order affect the outcome?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {rows.map((c) => (
          <div
            key={c.drink}
            className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-800 dark:text-stone-100">{c.drink}</span>
              <span
                className={`font-bold ${
                  c.winRate >= 60
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : c.winRate <= 40
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                {c.wins}W-{c.losses}L
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-stone-200 dark:bg-stone-600 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${c.winRate}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${100 - c.winRate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
