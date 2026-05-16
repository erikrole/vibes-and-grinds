import { memo, useState } from 'react';

// Collapsible "Extras" drawer — storylines, head-to-head comparison, coffee crossover.
// Demoted from the main flow so the dashboard reads cleanly; expands on demand.
function VestExtras({ milestones, outfitStats, outfitBadges, coffeeCrossover }) {
  const [openTab, setOpenTab] = useState(null);
  const [compareOutfits, setCompareOutfits] = useState([null, null]);

  const tabs = [
    { value: 'storylines', label: 'Storylines', count: milestones.length, available: milestones.length > 0 },
    { value: 'compare', label: 'Head-to-Head', count: null, available: outfitStats.length >= 2 },
    { value: 'coffee', label: 'Game-Day Coffee', count: coffeeCrossover.length, available: coffeeCrossover.length > 0 },
  ].filter((t) => t.available);

  if (!tabs.length) return null;

  const comparisonData = (() => {
    const [a, b] = compareOutfits;
    if (!a || !b) return null;
    const statA = outfitStats.find((s) => s.outfit === a);
    const statB = outfitStats.find((s) => s.outfit === b);
    if (!statA || !statB) return null;
    return {
      a: { ...statA, badges: outfitBadges[a] || [] },
      b: { ...statB, badges: outfitBadges[b] || [] },
    };
  })();

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm mb-6 overflow-hidden">
      <div className="flex border-b border-stone-100 dark:border-stone-700 overflow-x-auto">
        {tabs.map((tab) => {
          const isOpen = openTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setOpenTab(isOpen ? null : tab.value)}
              className={`relative px-4 sm:px-5 py-3 text-xs uppercase tracking-[0.12em] font-bold whitespace-nowrap transition-colors ${
                isOpen
                  ? 'text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="ml-1.5 text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
                  {tab.count}
                </span>
              )}
              {isOpen && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-600 dark:bg-red-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {openTab === 'storylines' && (
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {milestones.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2.5 text-sm text-stone-700 dark:text-stone-200"
              >
                <span className="text-base shrink-0 leading-tight">{m.icon}</span>
                <span className="leading-tight">{m.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {openTab === 'compare' && (
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {[0, 1].map((slot) => (
              <select
                key={slot}
                value={compareOutfits[slot] || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setCompareOutfits((prev) => {
                    const next = [...prev];
                    next[slot] = val;
                    return next;
                  });
                }}
                className="rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm flex-1 min-w-[140px]"
              >
                <option value="">Select outfit {slot + 1}</option>
                {outfitStats.map((s) => (
                  <option key={s.outfit} value={s.outfit}>{s.outfit}</option>
                ))}
              </select>
            ))}
            {(compareOutfits[0] || compareOutfits[1]) && (
              <button
                onClick={() => setCompareOutfits([null, null])}
                className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors px-2"
              >
                Clear
              </button>
            )}
          </div>

          {comparisonData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CompareCard stat={comparisonData.a} other={comparisonData.b} />
              <CompareCard stat={comparisonData.b} other={comparisonData.a} />
            </div>
          ) : (
            <p className="text-xs text-stone-500 dark:text-stone-400 text-center py-4">
              Pick two outfits to compare.
            </p>
          )}
        </div>
      )}

      {openTab === 'coffee' && (
        <div className="px-5 py-4">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
            Drinks ordered on game days, by outcome.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {coffeeCrossover.map((c) => (
              <div
                key={c.drink}
                className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-stone-800 dark:text-stone-100 text-sm truncate">
                    {c.drink}
                  </span>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      c.winRate >= 60
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : c.winRate <= 40
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {c.wins}–{c.losses}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-200 dark:bg-stone-600 overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${c.winRate}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${100 - c.winRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CompareCard({ stat, other }) {
  const winning = stat.smoothedRate > other.smoothedRate;
  return (
    <div
      className={`rounded-xl border p-3 ${
        winning
          ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-700/60 dark:bg-emerald-900/10'
          : 'border-stone-200 dark:border-stone-600'
      }`}
    >
      <h4 className="font-bold text-stone-900 dark:text-stone-100 mb-2 text-sm">{stat.outfit}</h4>
      <div className="space-y-1 text-xs text-stone-600 dark:text-stone-300 tabular-nums">
        <p>
          Record: <span className="font-semibold">{stat.wins}–{stat.losses}</span> ({stat.smoothedRatePct}% smoothed)
        </p>
        <p>Q1: {stat.quadrants[1].wins}–{stat.quadrants[1].losses} · Q2: {stat.quadrants[2].wins}–{stat.quadrants[2].losses}</p>
        <p>Q3: {stat.quadrants[3].wins}–{stat.quadrants[3].losses} · Q4: {stat.quadrants[4].wins}–{stat.quadrants[4].losses}</p>
        <p>
          vs Expected:{' '}
          <span className={stat.winsAboveExpected >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-red-700 dark:text-red-400 font-semibold'}>
            {stat.winsAboveExpected >= 0 ? '+' : ''}{stat.winsAboveExpected.toFixed(1)}
          </span>
        </p>
        {stat.avgNet && <p>Avg opp NET: #{stat.avgNet}</p>}
        {stat.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {stat.badges.map((b) => (
              <span
                key={b}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(VestExtras);
