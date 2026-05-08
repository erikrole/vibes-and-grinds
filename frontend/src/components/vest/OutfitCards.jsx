import { formatLocationLabel } from '../../utils/vestStats';

export default function OutfitCards({
  outfitStats,
  outfitBadges,
  selectedOutfit,
  onSelectOutfit,
  netStatus,
  netRankingsCount,
}) {
  return (
    <section className="mb-6">
      <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500 mb-3 font-semibold">
        Tap an outfit to filter timeline
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {outfitStats.map((stat) => {
          const winPct = stat.games > 0 ? Math.round((stat.wins / stat.games) * 100) : 0;
          const isSelected = selectedOutfit === stat.outfit;

          return (
            <button
              key={stat.outfit}
              onClick={() => onSelectOutfit(isSelected ? 'All outfits' : stat.outfit)}
              className={`bg-white dark:bg-stone-800 border rounded-2xl p-5 shadow-sm text-left transition-all hover:shadow-md active:scale-[0.99] ${
                isSelected
                  ? 'border-red-500 dark:border-red-600 ring-2 ring-red-500/20 dark:ring-red-600/30'
                  : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    {stat.outfit}
                  </h3>
                  {stat.form === 'hot' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                      🔥 Hot
                    </span>
                  )}
                  {stat.form === 'cold' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      ❄️ Cold
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-lg font-black text-stone-900 dark:text-stone-100">
                    {stat.wins}-{stat.losses}
                  </span>
                  <span className="block text-[10px] font-semibold text-stone-400 dark:text-stone-500">
                    {winPct}% win
                  </span>
                </div>
              </div>

              {outfitBadges[stat.outfit]?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {outfitBadges[stat.outfit].map((badge) => (
                    <span
                      key={badge}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              <div className="h-2.5 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 rounded-l-full transition-all"
                  style={{ width: `${winPct}%` }}
                  title={`Wins: ${stat.wins}`}
                />
                <div
                  className="h-full bg-red-400 dark:bg-red-500 rounded-r-full transition-all"
                  style={{ width: `${100 - winPct}%` }}
                  title={`Losses: ${stat.losses}`}
                />
              </div>

              <p className="mt-2.5 text-xs text-stone-500 dark:text-stone-400">
                {stat.games} {stat.games === 1 ? 'game' : 'games'} · last{' '}
                {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}
                {stat.avgNet && netStatus === 'loaded' && ` · SoS #${stat.avgNet}`}
              </p>

              <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-semibold text-stone-600 dark:text-stone-300">
                {[1, 2, 3, 4].map((quad) => (
                  <div
                    key={quad}
                    className="rounded-lg bg-stone-50 dark:bg-stone-700/50 px-2 py-1.5 text-center"
                  >
                    <span className="text-stone-400 dark:text-stone-500">Q{quad}</span>{' '}
                    {netStatus === 'loaded'
                      ? `${stat.quadrants[quad].wins}-${stat.quadrants[quad].losses}`
                      : '—'}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <NetStatusFooter status={netStatus} count={netRankingsCount} />
    </section>
  );
}

function NetStatusFooter({ status, count }) {
  if (status === 'loaded') {
    return (
      <p className="text-xs text-stone-500 mt-3">
        NET feed loaded: {count} teams (target ~365).
      </p>
    );
  }
  return (
    <p className="text-xs text-stone-500 mt-3">
      {status === 'missing-url' &&
        'Set NET_RANKINGS_URL on the API (or VITE_NET_RANKINGS_URL in frontend) to load live NET-based quadrant records. Big Ten standings worker payloads are supported.'}
      {status === 'loading' && (
        <>
          <span className="inline-block w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mr-1.5 align-middle" />
          Loading live NET rankings&hellip;
        </>
      )}
      {status === 'error' &&
        'Unable to load NET rankings. Quadrant stats are temporarily unavailable.'}
    </p>
  );
}
