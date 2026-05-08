import { useMemo, useState } from 'react';

export default function HeadToHeadCompare({ outfitStats, outfitBadges }) {
  const [picks, setPicks] = useState([null, null]);

  const data = useMemo(() => {
    const [a, b] = picks;
    if (!a || !b) return null;
    const statA = outfitStats.find((s) => s.outfit === a);
    const statB = outfitStats.find((s) => s.outfit === b);
    if (!statA || !statB) return null;
    return {
      a: { ...statA, badges: outfitBadges[a] || [] },
      b: { ...statB, badges: outfitBadges[b] || [] },
    };
  }, [picks, outfitStats, outfitBadges]);

  if (outfitStats.length < 2) return null;

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          Head-to-Head Comparison
        </h3>
        {(picks[0] || picks[1]) && (
          <button
            onClick={() => setPicks([null, null])}
            className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {[0, 1].map((slot) => (
          <select
            key={slot}
            value={picks[slot] || ''}
            onChange={(e) => {
              const val = e.target.value || null;
              setPicks((prev) => {
                const next = [...prev];
                next[slot] = val;
                return next;
              });
            }}
            className="rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2.5 text-sm w-full sm:w-auto"
          >
            <option value="">Select outfit {slot + 1}</option>
            {outfitStats.map((s) => (
              <option key={s.outfit} value={s.outfit}>
                {s.outfit}
              </option>
            ))}
          </select>
        ))}
      </div>
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[data.a, data.b].map((s) => (
            <ComparisonCard key={s.outfit} stat={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function ComparisonCard({ stat }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-600 p-4">
      <h4 className="font-bold text-stone-900 dark:text-stone-100 mb-2">{stat.outfit}</h4>
      <div className="space-y-1 text-sm text-stone-600 dark:text-stone-300">
        <p>
          Record: <span className="font-semibold">{stat.wins}-{stat.losses}</span> ({stat.winRate}%)
        </p>
        <p>
          Q1: {stat.quadrants[1].wins}-{stat.quadrants[1].losses} • Q2:{' '}
          {stat.quadrants[2].wins}-{stat.quadrants[2].losses}
        </p>
        <p>
          Q3: {stat.quadrants[3].wins}-{stat.quadrants[3].losses} • Q4:{' '}
          {stat.quadrants[4].wins}-{stat.quadrants[4].losses}
        </p>
        {stat.avgNet && <p>Avg opponent NET: #{stat.avgNet}</p>}
        <p>
          Form: {stat.form === 'hot' ? '🔥 Hot' : stat.form === 'cold' ? '❄️ Cold' : 'Neutral'}
        </p>
        {stat.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {stat.badges.map((b) => (
              <span
                key={b}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
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
