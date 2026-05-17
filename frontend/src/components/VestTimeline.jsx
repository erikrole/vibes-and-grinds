import { memo, useRef, useEffect } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

// Horizontal scrolling game log. Each chip is a compact score-card row;
// latest game on the right (auto-scrolled into view), red left rail on the
// most recent chip. Pending chips show inline W/L buttons for quick logging.
function VestTimeline({ games, onEditGame, onLogResult }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [games.length]);

  if (!games.length) return null;

  const hasPending = games.some((g) => g.result !== 'W' && g.result !== 'L');

  return (
    <section className="vt-card mb-6 overflow-hidden">
      <div className="vt-section-head">
        <span className="vt-label">Game Log</span>
        <span className="vt-label">
          {games.length} games · {hasPending ? 'tap result or ' : ''}tap to edit
        </span>
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
            onEdit={() => onEditGame(game)}
            onLogResult={onLogResult}
          />
        ))}
      </div>
    </section>
  );
}

// Chip uses a div container so W/L quick-log buttons can be true <button>
// elements without nesting buttons inside a button.
function TimelineChip({ game, index, isLast, onEdit, onLogResult }) {
  const isWin = game.result === 'W';
  const isLoss = game.result === 'L';
  const isPending = !isWin && !isLoss;

  const resultClass = isWin
    ? 'vt-result-w'
    : isLoss
    ? 'vt-result-l'
    : 'vt-result-pending';

  return (
    <div
      role="listitem"
      className="group relative min-w-[176px] snap-start vt-card-inset text-left"
      style={
        isLast
          ? { borderLeftWidth: '3px', borderLeftColor: 'var(--vt-red)', borderLeftStyle: 'solid' }
          : undefined
      }
    >
      {/* Clickable game info area — opens full edit form */}
      <button
        onClick={onEdit}
        aria-label={`Edit game ${index + 1}: ${formatLocationLabel(game.location, 'full')} ${game.opponent}`}
        className="w-full px-3 pt-2.5 pb-2 text-left hover:bg-white/[0.02] transition-colors rounded-t"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="vt-label text-[10px] vt-tabular">
            {String(index + 1).padStart(2, '0')} ·{' '}
            {formatDate(game.date)?.replace(/,.*/, '') || '—'}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[11px] vt-tabular ${resultClass}`}>
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
          {game.outfit || '—'}
        </div>
      </button>

      {/* Inline quick-log row for pending games */}
      {isPending && onLogResult && (
        <div className="flex border-t border-[color:var(--vt-rule)]">
          <button
            onClick={() => onLogResult(game.id, 'W', false)}
            aria-label={`Log win for game vs ${game.opponent}`}
            className="flex-1 py-1.5 vt-condensed text-xs tracking-[0.14em] uppercase transition-colors"
            style={{ color: 'var(--vt-red)', background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vt-red-soft)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            W
          </button>
          <div
            aria-hidden
            className="w-px"
            style={{ background: 'var(--vt-rule)' }}
          />
          <button
            onClick={() => onLogResult(game.id, 'L', false)}
            aria-label={`Log loss for game vs ${game.opponent}`}
            className="flex-1 py-1.5 vt-condensed text-xs tracking-[0.14em] uppercase transition-colors"
            style={{ color: 'var(--vt-ink-mute)', background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            L
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(VestTimeline);
