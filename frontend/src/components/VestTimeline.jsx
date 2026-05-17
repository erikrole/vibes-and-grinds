import { memo, useRef, useEffect } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

// Horizontal scrolling game log. Each chip is a compact score-card row;
// latest game on the right (auto-scrolled into view), red left rail on the
// most recent chip.
function VestTimeline({ games, onEditGame }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [games.length]);

  if (!games.length) return null;

  return (
    <section className="vt-card mb-6 overflow-hidden">
      <div className="vt-section-head">
        <span className="vt-label">Game Log</span>
        <span className="vt-label">{games.length} games · tap to edit</span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 sm:px-5 py-4 snap-x snap-mandatory"
        role="list"
      >
        {games.map((game, index) => (
          <TimelineChip
            key={`${game.id}-${index}`}
            game={game}
            index={index}
            isLast={index === games.length - 1}
            onClick={() => onEditGame(game)}
          />
        ))}
      </div>
    </section>
  );
}

function TimelineChip({ game, index, isLast, onClick }) {
  const isWin = game.result === 'W';
  const isLoss = game.result === 'L';
  const isPending = !isWin && !isLoss;

  const resultClass = isWin
    ? 'vt-result-w'
    : isLoss
    ? 'vt-result-l'
    : 'vt-result-pending';

  return (
    <button
      role="listitem"
      onClick={onClick}
      aria-label={`Edit game ${index + 1}: ${formatLocationLabel(game.location, 'full')} ${game.opponent}`}
      className="group relative min-w-[176px] snap-start vt-card-inset px-3 py-2.5 text-left hover:border-[color:var(--vt-rule-strong)] transition-colors"
      style={
        isLast
          ? { borderLeftWidth: '3px', borderLeftColor: 'var(--vt-red)', borderLeftStyle: 'solid' }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="vt-label text-[10px] vt-tabular">
          {String(index + 1).padStart(2, '0')} ·{' '}
          {formatDate(game.date)?.replace(/,.*/, '') || '—'}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[11px] vt-tabular ${resultClass}`}
        >
          {isPending ? 'TBD' : isWin ? 'W' : 'L'}
          {game.quadrant ? <span className="opacity-70 ml-1">Q{game.quadrant}</span> : null}
        </span>
      </div>

      <div className="vt-condensed text-base text-[color:var(--vt-ink)] uppercase leading-tight truncate">
        {formatLocationLabel(game.location, 'short')}{' '}
        {game.ranking ? (
          <span className="vt-mono text-xs text-[color:var(--vt-red)]">
            {toSuperscript(game.ranking)}
          </span>
        ) : null}
        {game.opponent}
        {game.overtime && (
          <span className="vt-mono text-[10px] text-[color:var(--vt-ink-mute)] ml-1">OT</span>
        )}
      </div>

      <div className="vt-mono text-[11px] text-[color:var(--vt-ink-mute)] mt-1 truncate">
        {game.outfit || (isPending ? '—' : '—')}
      </div>
    </button>
  );
}

export default memo(VestTimeline);
