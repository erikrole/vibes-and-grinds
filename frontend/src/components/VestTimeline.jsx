import { memo, useMemo, useState } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

function VestTimeline({ games, onEditGame, onLogResult }) {
  const [showAll, setShowAll] = useState(false);
  const visibleGames = useMemo(
    () => (showAll ? [...games] : games.slice(-8)).reverse(),
    [games, showAll]
  );

  if (!games.length) return null;

  return (
    <section className="vt-card mb-6 overflow-hidden">
      <div className="vt-section-head">
        <div>
          <span className="vt-label block">Recent Games</span>
          <span className="vt-mono text-[10px] text-[color:var(--vt-ink-faint)] mt-1 block">Newest first · select a game to edit</span>
        </div>
        {games.length > 8 && (
          <button type="button" onClick={() => setShowAll((value) => !value)} className="vt-label hover:text-[color:var(--vt-ink)] transition-colors">
            {showAll ? 'Show recent' : `View all ${games.length}`}
          </button>
        )}
      </div>
      <div className="divide-y divide-[color:var(--vt-rule)]" role="list">
        {visibleGames.map((game) => (
          <GameRow key={game.id} game={game} onEdit={() => onEditGame(game)} onLogResult={onLogResult} />
        ))}
      </div>
    </section>
  );
}

function GameRow({ game, onEdit, onLogResult }) {
  const pending = game.result !== 'W' && game.result !== 'L';
  return (
    <div role="listitem" className="flex items-stretch">
      <button type="button" onClick={onEdit} className="flex-1 min-w-0 grid grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:grid-cols-[5rem_minmax(0,1fr)_minmax(10rem,.7fr)_auto] items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-white/[0.025] transition-colors" aria-label={`Edit ${formatLocationLabel(game.location, 'full')} ${game.opponent}`}>
        <span className={`vt-display text-xl vt-tabular ${game.result === 'W' ? 'text-[color:var(--vt-red)]' : 'text-[color:var(--vt-ink-mute)]'}`}>{pending ? 'TBD' : game.result}</span>
        <span className="min-w-0">
          <strong className="vt-condensed text-base sm:text-lg uppercase text-[color:var(--vt-ink)] truncate block">
            {formatLocationLabel(game.location, 'short')} {game.ranking ? <span className="text-[color:var(--vt-red)]">{toSuperscript(game.ranking)}</span> : null}{game.opponent}{game.overtime ? ' OT' : ''}
          </strong>
          <small className="vt-mono text-[10px] text-[color:var(--vt-ink-faint)]">{formatDate(game.date) || 'Date TBD'}{game.quadrant ? ` · Q${game.quadrant}` : ''}</small>
        </span>
        <span className="hidden sm:block vt-condensed text-sm uppercase text-[color:var(--vt-ink-dim)] truncate">{game.outfit || 'Outfit TBD'}</span>
        <span className="vt-label text-[10px]">Edit</span>
      </button>
      {pending && onLogResult && (
        <div className="flex border-l border-[color:var(--vt-rule)]">
          <button type="button" onClick={() => onLogResult(game.id, 'W', false)} className="px-3 vt-display text-[color:var(--vt-red)] hover:bg-[color:var(--vt-red-soft)]" aria-label={`Log win against ${game.opponent}`}>W</button>
          <button type="button" onClick={() => onLogResult(game.id, 'L', false)} className="px-3 vt-display text-[color:var(--vt-ink-mute)] hover:bg-white/[0.03]" aria-label={`Log loss against ${game.opponent}`}>L</button>
        </div>
      )}
    </div>
  );
}

export default memo(VestTimeline);
