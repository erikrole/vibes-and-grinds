import { memo } from 'react';
import { formatDate, formatLocationLabel } from '../utils/vestTrackerMath';

function VestNextGame({ scoutingReport: game, mostWorn: outfit }) {
  if (!game && !outfit) return null;
  return (
    <section className="vp-tip" aria-labelledby="vest-next-heading">
      <p className="vp-kicker vp-kicker-ink">{game ? 'Next tip' : 'Most worn'}</p>
      {game && (
        <>
          <h2 id="vest-next-heading" className="vp-display vp-tip-title">
            {formatLocationLabel(game.location, 'full')} {game.opponent}
          </h2>
          <p className="vp-section-note">{formatDate(game.date) || 'Date to be set'}</p>
        </>
      )}
      {outfit && (
        <p className="vp-section-note">
          Most worn <span className="vp-ink">{outfit.outfit}</span>
          {' '}· {outfit.wins}–{outfit.losses} in {outfit.games} {outfit.games === 1 ? 'game' : 'games'}
        </p>
      )}
    </section>
  );
}

export default memo(VestNextGame);
