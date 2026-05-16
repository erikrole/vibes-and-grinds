import { memo, useRef, useEffect } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

// Horizontal timeline rendered as a retro broadcast ticker.
// Each game is a neon-edged card; auto-scrolls to the most recent on mount.
function VestTimeline({ games, onEditGame }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [games.length]);

  if (!games.length) return null;

  return (
    <section className="vt-reveal vt-reveal-2 vt-card mb-6 sm:mb-7 overflow-hidden">
      {/* Ticker header bar */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-[color:var(--vt-rule)] bg-[rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-3">
          <span className="vt-mojo text-[10px] tracking-[0.32em] text-[color:var(--vt-crimson)] uppercase">
            ❮ Live Wire
          </span>
          <span className="vt-mono text-[10px] tracking-[0.22em] text-[color:var(--vt-ink-faint)] uppercase">
            Season Tape
          </span>
        </div>
        <span className="vt-mono text-[10px] tracking-[0.22em] text-[color:var(--vt-cyan)] uppercase">
          {games.length} games · tap to edit
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-4 pt-4 px-4 sm:px-5 snap-x snap-mandatory"
        role="list"
      >
        {games.map((game, index) => (
          <TickerChip
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

function TickerChip({ game, index, isLast, onClick }) {
  const isWin = game.result === 'W';
  const isLoss = game.result === 'L';
  const isPending = !isWin && !isLoss;
  const resultLabel = isWin ? 'W' : isLoss ? 'L' : 'TBD';

  // Border / glow coloring by result
  const accent = isWin ? 'var(--vt-cyan)' : isLoss ? 'var(--vt-crimson)' : 'var(--vt-gold)';
  const glow = isWin
    ? 'var(--vt-cyan-glow)'
    : isLoss
    ? 'var(--vt-crimson-glow)'
    : 'rgba(244,197,66,0.45)';

  return (
    <button
      role="listitem"
      onClick={onClick}
      aria-label={`Edit game ${index + 1}: ${formatLocationLabel(game.location, 'full')} ${game.opponent}, ${resultLabel}`}
      className="group relative min-w-[180px] snap-start rounded-md text-left transition-all hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none"
      style={{
        background: 'rgba(0, 0, 0, 0.45)',
        border: `1px solid ${accent}`,
        boxShadow: isLast
          ? `0 0 28px -4px ${glow}, inset 0 0 0 1px rgba(255,255,255,0.04)`
          : `0 0 0 0 transparent, inset 0 0 0 1px rgba(255,255,255,0.04)`,
      }}
    >
      {/* Game number stamp */}
      <div
        className="absolute -top-1.5 -left-1.5 vt-mojo text-[9px] tracking-[0.12em] px-1.5 py-0.5 bg-[color:var(--vt-bg-0)] border border-[color:var(--vt-rule)] rounded"
        style={{ color: accent }}
      >
        #{String(index + 1).padStart(2, '0')}
      </div>

      <div className="px-3 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="vt-mono text-[9px] tracking-[0.16em] text-[color:var(--vt-ink-faint)] uppercase">
            {formatDate(game.date)?.replace(/,.*/, '') || `Game ${index + 1}`}
          </span>
          <span
            className="vt-anton text-xs px-1.5 py-0.5 rounded tabular-nums"
            style={{
              background: isPending ? 'rgba(255,255,255,0.06)' : accent,
              color: isPending ? 'var(--vt-ink-faint)' : '#0a0418',
              textShadow: isPending ? 'none' : '0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            {resultLabel}
            {game.quadrant ? ` Q${game.quadrant}` : ''}
          </span>
        </div>

        <div className="vt-anton text-base text-[color:var(--vt-ink)] mt-1.5 leading-[1.05] truncate">
          {formatLocationLabel(game.location, 'short').toUpperCase()}{' '}
          {game.ranking ? (
            <span className="vt-mono text-xs text-[color:var(--vt-cyan)]">
              {toSuperscript(game.ranking)}
            </span>
          ) : null}
          {game.opponent.toUpperCase()}
          {game.overtime && (
            <span className="vt-mono text-[9px] text-[color:var(--vt-gold)] ml-1 tracking-wider">
              OT
            </span>
          )}
        </div>

        <div className="vt-mono text-[10px] text-[color:var(--vt-ink-faint)] mt-1 truncate tracking-wider">
          {game.outfit || (isPending ? '— tbd —' : '—')}
        </div>
      </div>
    </button>
  );
}

export default memo(VestTimeline);
