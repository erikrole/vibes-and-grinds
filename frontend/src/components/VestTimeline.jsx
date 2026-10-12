import { memo, useMemo, useState } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

function VestTimeline({ games, onEditGame, onLogResult, mode = 'recent' }) {
  const [showAll, setShowAll] = useState(false);
  const upcoming = mode === 'upcoming';
  const visibleGames = useMemo(() => {
    if (upcoming) return showAll ? games : games.slice(0, 8);
    return (showAll ? [...games] : games.slice(-8)).reverse();
  }, [games, showAll, upcoming]);

  if (!games.length) return null;
  const headingId = upcoming ? 'vest-upcoming-heading' : 'vest-games-heading';

  return (
    <section className="vt-card mb-6 overflow-hidden" aria-labelledby={headingId}>
      <div className="vt-section-head">
        <div>
          <h2 id={headingId} className="vt-label block">{upcoming ? 'Upcoming' : 'Recent games'}</h2>
          <span className="vt-mono text-[11px] text-[color:var(--vt-ink-mute)] mt-1 block">{upcoming ? 'From the schedule' : 'Newest first'}</span>
        </div>
        {games.length > 8 && (
          <button type="button" onClick={() => setShowAll((value) => !value)} className="vt-label hover:text-[color:var(--vt-ink)] transition-colors">
            {showAll ? (upcoming ? 'Show next' : 'Show recent') : `View all ${games.length}`}
          </button>
        )}
      </div>
      <div className="vt-game-list" role="list">
        {visibleGames.map((game) => (
          <GameCard key={game.id} game={game} onEdit={onEditGame ? () => onEditGame(game) : undefined} onLogResult={onLogResult} />
        ))}
      </div>
    </section>
  );
}

function GameCard({ game, onEdit, onLogResult }) {
  const pending = game.result !== 'W' && game.result !== 'L';
  const resultClass = pending ? 'is-tbd' : game.result === 'W' ? 'is-w' : 'is-l';
  const where = formatLocationLabel(game.location, 'short');
  const cardBody = (
    <>
      <span className={`vt-result-pill ${resultClass}`}>{pending ? 'TBD' : game.result}</span>
      <span className="min-w-0">
        <strong className="vt-condensed vt-game-opponent text-[color:var(--vt-ink)]">
          {where} {game.ranking ? <span className="text-[color:var(--vt-red)]">{toSuperscript(game.ranking)}</span> : null}{game.opponent}{game.overtime ? ' OT' : ''}
        </strong>
        <span className="vt-game-meta vt-mono">
          <span>{formatDate(game.date) || 'Date TBD'}</span>
          {game.quadrant ? <span>Q{game.quadrant}</span> : null}
          {game.source === 'espn' ? null : <span className="vt-game-outfit">{game.outfit || 'Outfit TBD'}</span>}
        </span>
      </span>
    </>
  );
  return (
    <div role="listitem" className="vt-game-row">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="vt-game-card"
          aria-label={`View ${formatLocationLabel(game.location, 'full')} ${game.opponent}, ${formatDate(game.date) || 'date TBD'}, ${game.outfit || 'outfit TBD'}`}
        >
          {cardBody}
        </button>
      ) : (
        <div className="vt-game-card">{cardBody}</div>
      )}
      {pending && onLogResult && (
        <div className="vt-game-log">
          <button type="button" onClick={() => onLogResult(game.id, 'W', false)} className="vt-display text-[color:var(--vt-red)]" aria-label={`Log win against ${game.opponent}`}>W</button>
          <button type="button" onClick={() => onLogResult(game.id, 'L', false)} className="vt-display text-[color:var(--vt-ink-mute)]" aria-label={`Log loss against ${game.opponent}`}>L</button>
        </div>
      )}
    </div>
  );
}

export default memo(VestTimeline);
