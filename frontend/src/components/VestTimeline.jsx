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
    <section className="vp-section" aria-labelledby={headingId}>
      <div className="vp-section-head">
        <div>
          <h2 id={headingId}>{upcoming ? 'Upcoming' : 'Recent games'}</h2>
          <p className="vp-section-note">
            {upcoming ? 'From the schedule. Nothing here is saved until a game is logged.' : 'Newest first.'}
          </p>
        </div>
        {games.length > 8 && (
          <button type="button" onClick={() => setShowAll((value) => !value)} className="vp-text-btn">
            {showAll ? (upcoming ? 'Show next' : 'Show recent') : `View all ${games.length}`}
          </button>
        )}
      </div>
      <div className="vp-tickets" role="list">
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
  const where = formatLocationLabel(game.location, 'full');
  const dateLabel = formatDate(game.date) || 'Date TBD';
  const body = (
    <>
      <span className={`vp-stub ${resultClass}`}>
        <span className="vp-stub-mark">{pending ? 'TBD' : game.result}</span>
      </span>
      <span className="vp-ticket-body">
        <strong className="vp-opponent">
          {where} {game.ranking ? <span className="vp-rank">{toSuperscript(game.ranking)}</span> : null}{game.opponent}{game.overtime ? ' OT' : ''}
        </strong>
        <span className="vp-ticket-meta">
          <span>{dateLabel}</span>
          {game.quadrant ? <span>Q{game.quadrant}</span> : null}
          {game.source === 'espn' ? null : <span>{game.outfit || 'Outfit TBD'}</span>}
        </span>
      </span>
    </>
  );
  return (
    <article role="listitem" className="vp-ticket">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="vp-ticket-hit"
          aria-label={`View ${where} ${game.opponent}, ${dateLabel}, ${game.outfit || 'outfit TBD'}`}
        >
          {body}
        </button>
      ) : (
        <div className="vp-ticket-hit">{body}</div>
      )}
      {pending && onLogResult && (
        <div className="vp-log">
          <button type="button" onClick={() => onLogResult(game.id, 'W', false)} aria-label={`Log win against ${game.opponent}`}>W</button>
          <button type="button" onClick={() => onLogResult(game.id, 'L', false)} aria-label={`Log loss against ${game.opponent}`}>L</button>
        </div>
      )}
    </article>
  );
}

export default memo(VestTimeline);
