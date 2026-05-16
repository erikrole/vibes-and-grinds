import { memo, useRef, useEffect } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

// Horizontal season timeline. Newest game on the right; auto-scrolls to end on mount
// so the most recent game is in view.
function VestTimeline({ games, onEditGame }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [games.length]);

  if (!games.length) return null;

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Season Timeline</h3>
        <span className="text-[10px] uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500 font-semibold">
          Tap to edit · {games.length} games
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
        role="list"
      >
        {games.map((game, index) => (
          <TimelineChip key={`${game.id}-${index}`} game={game} index={index} onClick={() => onEditGame(game)} />
        ))}
      </div>
    </section>
  );
}

function TimelineChip({ game, index, onClick }) {
  const isWin = game.result === 'W';
  const isLoss = game.result === 'L';
  const isPending = !isWin && !isLoss;
  const resultLabel = isWin ? 'W' : isLoss ? 'L' : 'TBD';

  const cardClass = isWin
    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/15 dark:border-emerald-800/50'
    : isLoss
    ? 'bg-red-50 border-red-200 dark:bg-red-900/15 dark:border-red-800/50'
    : 'bg-stone-50 border-stone-200 dark:bg-stone-700/30 dark:border-stone-600';

  const badgeClass = isWin
    ? 'bg-emerald-200/70 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-300'
    : isLoss
    ? 'bg-red-200/70 text-red-800 dark:bg-red-800/40 dark:text-red-300'
    : 'bg-stone-200/70 text-stone-700 dark:bg-stone-600/40 dark:text-stone-300';

  return (
    <button
      role="listitem"
      onClick={onClick}
      aria-label={`Edit game ${index + 1}: ${formatLocationLabel(game.location, 'full')} ${game.opponent}, ${resultLabel}`}
      className={`min-w-[170px] snap-start rounded-xl border px-3 py-2.5 text-left transition-all hover:shadow-md hover:-translate-y-px active:scale-[0.98] ${cardClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
          {formatDate(game.date) || `Game ${index + 1}`}
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums ${badgeClass}`}>
          {resultLabel}
          {game.quadrant ? ` Q${game.quadrant}` : ''}
        </span>
      </div>
      <div className="font-bold text-stone-900 dark:text-stone-100 mt-1 text-sm leading-tight">
        {formatLocationLabel(game.location, 'short')}{' '}
        {game.ranking ? (
          <span className="text-stone-400 dark:text-stone-500">{toSuperscript(game.ranking)} </span>
        ) : null}
        {game.opponent}
        {game.overtime && <span className="text-[10px] text-stone-500 dark:text-stone-400 ml-1">OT</span>}
      </div>
      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
        {game.outfit || (isPending ? 'Outfit TBD' : '—')}
      </div>
    </button>
  );
}

export default memo(VestTimeline);
