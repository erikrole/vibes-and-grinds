import { memo } from 'react';

// Editorial scoreboard hero — bold W-L on charcoal, streak chip, optional
// filter chip when the user has narrowed to a single outfit.
function VestScoreboard({ wins, losses, streak, secondary, filterLabel, onClearFilter }) {
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-neutral-900 text-neutral-100 shadow-sm mb-6">
      {/* Stadium dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '14px 14px' }}
      />

      <div className="relative px-5 sm:px-7 py-5 sm:py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-red-300/70 font-semibold">
              {filterLabel ? `${filterLabel} · Record` : 'Season Record'}
            </p>
            <div className="flex items-baseline gap-3 mt-1.5">
              <h2 className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums leading-none">
                {wins}<span className="text-neutral-500 font-bold">–</span>{losses}
              </h2>
              {winPct != null && (
                <span className="text-sm font-semibold text-neutral-400 tabular-nums">
                  {winPct}%
                </span>
              )}
              {streak && streak.count >= 2 && (
                <StreakChip streak={streak} />
              )}
            </div>
          </div>

          {filterLabel && (
            <button
              onClick={onClearFilter}
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-neutral-800/80 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 transition-colors"
            >
              <span className="text-neutral-400">Filtered</span>
              <span className="font-semibold text-neutral-100 truncate max-w-[180px]">{filterLabel}</span>
              <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Secondary scoreboard pills: Q1+Q2 record, road record, OT record */}
        {secondary?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {secondary.map((pill) => (
              <div
                key={pill.label}
                className="rounded-lg bg-neutral-800/60 border border-neutral-700/60 px-3 py-1.5"
              >
                <span className="block text-[9px] uppercase tracking-[0.14em] text-neutral-500 font-semibold">
                  {pill.label}
                </span>
                <span className="text-sm font-bold tabular-nums text-neutral-100">
                  {pill.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StreakChip({ streak }) {
  const isWin = streak.result === 'W';
  return (
    <span
      className={`text-xs font-bold px-2.5 py-1 rounded-full tabular-nums ${
        isWin
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          : 'bg-red-500/15 text-red-300 border border-red-500/30'
      }`}
    >
      {isWin ? '🔥 ' : '❄️ '}{streak.count} {isWin ? 'W' : 'L'} streak
    </span>
  );
}

export default memo(VestScoreboard);
