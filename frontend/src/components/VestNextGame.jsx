import { memo } from 'react';
import { formatDate, formatLocationLabel } from '../utils/vestTrackerMath';

function VestNextGame({ scoutingReport: game, mostWorn: outfit }) {
  if (!game && !outfit) return null;
  return <section className="vt-card mb-6 overflow-hidden">
    <div className="vt-section-head"><span className="vt-label">{game ? 'Next game' : 'Completed season'}</span>{game?.date && <span className="vt-label">{formatDate(game.date)}</span>}</div>
    <div className="p-5 sm:p-6">
      {game && <div className="mb-5"><h2 className="vt-display-tight text-3xl sm:text-4xl">{formatLocationLabel(game.location, 'full')} {game.opponent}</h2>{game.netRank && <p className="vt-mono text-sm mt-2 text-[color:var(--vt-ink-mute)]">Opponent NET #{game.netRank}{game.quadrant ? ` · Q${game.quadrant}` : ''}</p>}</div>}
      {outfit && <><p className="vt-label mb-2">Most worn outfit</p><h3 className="vt-display-tight text-3xl sm:text-4xl">{outfit.outfit}</h3><p className="vt-mono text-sm mt-3 text-[color:var(--vt-ink-mute)]">{outfit.wins}–{outfit.losses} in {outfit.games} games worn</p></>}
    </div>
  </section>;
}
export default memo(VestNextGame);
