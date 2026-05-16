import { memo, useState } from 'react';
import { formatLocationLabel } from '../utils/vestTrackerMath';

const SORT_OPTIONS = [
  { value: 'wilson', label: 'Confidence' },
  { value: 'rate', label: 'Win %' },
  { value: 'woe', label: 'vs Expected' },
  { value: 'games', label: 'Games' },
];

const TIER_LABEL = {
  untested: 'no games',
  tiny: '1 game',
  small: 'small sample',
  decent: 'decent sample',
  solid: 'solid sample',
};

const TIER_DOTS = {
  untested: 0,
  tiny: 1,
  small: 2,
  decent: 3,
  solid: 4,
};

// Outfit leaderboard — Bayesian-smoothed rate, Wilson lower bound for ranking,
// wins above expected, sample-tier signaling. Click an outfit to filter.
function VestLeaderboard({
  stats,
  badges,
  selectedOutfit,
  onSelectOutfit,
  netStatus,
}) {
  const [sortBy, setSortBy] = useState('wilson');

  const sorted = [...stats].sort((a, b) => {
    if (sortBy === 'rate') return b.smoothedRate - a.smoothedRate || b.games - a.games;
    if (sortBy === 'woe') return b.woePerGame - a.woePerGame || b.games - a.games;
    if (sortBy === 'games') return b.games - a.games || b.smoothedRate - a.smoothedRate;
    return b.wilson - a.wilson || b.winsAboveExpected - a.winsAboveExpected;
  });

  if (!stats.length) {
    return (
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6 text-center text-sm text-stone-500 dark:text-stone-400">
        Add a few games to see the outfit leaderboard.
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          Outfit Leaderboard
        </h3>
        <div className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`text-[10px] uppercase tracking-[0.08em] font-bold px-2.5 py-1.5 rounded-md transition-colors ${
                sortBy === opt.value
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map((stat, rank) => (
          <OutfitCard
            key={stat.outfit}
            stat={stat}
            rank={rank + 1}
            isSelected={selectedOutfit === stat.outfit}
            onSelect={onSelectOutfit}
            badges={badges[stat.outfit] || []}
            netStatus={netStatus}
            sortBy={sortBy}
          />
        ))}
      </div>
    </section>
  );
}

function OutfitCard({ stat, rank, isSelected, onSelect, badges, netStatus, sortBy }) {
  const winPct = stat.winRatePct;
  const woeSign = stat.winsAboveExpected >= 0 ? '+' : '';
  const woeColor =
    stat.winsAboveExpected > 0.5
      ? 'text-emerald-700 dark:text-emerald-400'
      : stat.winsAboveExpected < -0.5
      ? 'text-red-700 dark:text-red-400'
      : 'text-stone-600 dark:text-stone-300';

  const primaryMetric =
    sortBy === 'woe'
      ? { label: 'vs Expected', value: `${woeSign}${stat.winsAboveExpected.toFixed(1)}`, color: woeColor }
      : sortBy === 'wilson'
      ? { label: 'Confidence', value: `${stat.wilsonPct}%`, color: 'text-stone-900 dark:text-stone-100' }
      : sortBy === 'games'
      ? { label: 'Games', value: `${stat.games}`, color: 'text-stone-900 dark:text-stone-100' }
      : { label: 'Smoothed', value: `${stat.smoothedRatePct}%`, color: 'text-stone-900 dark:text-stone-100' };

  return (
    <button
      onClick={() => onSelect(isSelected ? null : stat.outfit)}
      className={`bg-white dark:bg-stone-800 border rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md hover:-translate-y-px active:scale-[0.99] ${
        isSelected
          ? 'border-red-500 dark:border-red-500 ring-2 ring-red-500/20'
          : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500 font-bold tabular-nums">
              #{rank}
            </span>
            <SampleTier tier={stat.tier} />
          </div>
          <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1 truncate">
            {stat.outfit}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {stat.form === 'hot' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                🔥 HOT
              </span>
            )}
            {stat.form === 'cold' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                ❄️ COLD
              </span>
            )}
            {badges.slice(0, 2).map((badge) => (
              <span
                key={badge}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 truncate max-w-[140px]"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500 font-bold">
            {primaryMetric.label}
          </div>
          <div className={`text-2xl font-black tabular-nums leading-none mt-0.5 ${primaryMetric.color}`}>
            {primaryMetric.value}
          </div>
          <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
            {stat.wins}–{stat.losses}
          </div>
        </div>
      </div>

      {/* Win/loss bar */}
      <div
        className="h-2 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden flex"
        title={`${stat.wins}W – ${stat.losses}L (raw ${winPct}%)`}
      >
        <div className="h-full bg-emerald-500" style={{ width: `${winPct}%` }} />
        <div className="h-full bg-red-400 dark:bg-red-500" style={{ width: `${100 - winPct}%` }} />
      </div>

      {/* Footer metrics */}
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-stone-500 dark:text-stone-400 tabular-nums">
        <span>
          last: {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}
        </span>
        {stat.avgNet && netStatus === 'loaded' && <span>SoS #{stat.avgNet}</span>}
      </div>

      {/* Quadrant micro-table */}
      {netStatus === 'loaded' && (
        <div className="mt-2 grid grid-cols-4 gap-1 text-[9px] font-bold text-stone-600 dark:text-stone-300 tabular-nums">
          {[1, 2, 3, 4].map((q) => {
            const w = stat.quadrants[q].wins;
            const l = stat.quadrants[q].losses;
            const empty = w + l === 0;
            return (
              <div
                key={q}
                className={`rounded px-1.5 py-1 text-center ${
                  empty ? 'bg-stone-50 text-stone-300 dark:bg-stone-700/30 dark:text-stone-600' : 'bg-stone-100 dark:bg-stone-700/60'
                }`}
              >
                <span className="text-stone-400 dark:text-stone-500">Q{q}</span>{' '}
                {empty ? '—' : `${w}–${l}`}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// Visual sample-size indicator: 0–4 dots. More dots = larger sample,
// which makes the win rate more trustworthy.
function SampleTier({ tier }) {
  const count = TIER_DOTS[tier] ?? 0;
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={TIER_LABEL[tier]}
      aria-label={TIER_LABEL[tier]}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`block w-1 h-1 rounded-full ${
            i < count ? 'bg-stone-700 dark:bg-stone-300' : 'bg-stone-200 dark:bg-stone-600'
          }`}
        />
      ))}
    </span>
  );
}

export default memo(VestLeaderboard);
