import { memo, useState } from 'react';
import { formatLocationLabel, outfitSampleNote } from '../utils/vestTrackerMath';

function VestLeaderboard({ stats, selectedOutfit, onViewOutfit }) {
  const [sortBy, setSortBy] = useState('games');
  const sorted = [...stats].sort((a, b) => sortBy === 'rate'
    ? b.winRatePct - a.winRatePct || b.games - a.games
    : b.games - a.games || b.winRatePct - a.winRatePct);
  return (
    <section className="vp-section" aria-labelledby="vest-outfits-heading">
      <div className="vp-section-head">
        <div>
          <h2 id="vest-outfits-heading">Outfit records</h2>
          <p className="vp-section-note">Completed games only. Open an outfit to see the games behind it.</p>
        </div>
        <div className="vp-sort" role="group" aria-label="Sort outfit records">
          <button type="button" aria-pressed={sortBy === 'games'} onClick={() => setSortBy('games')} className={sortBy === 'games' ? 'is-active' : ''}>Most worn</button>
          <button type="button" aria-pressed={sortBy === 'rate'} onClick={() => setSortBy('rate')} className={sortBy === 'rate' ? 'is-active' : ''}>Win %</button>
        </div>
      </div>
      {!sorted.length ? <p className="vp-section-note">No outfit records yet.</p> : (
        <ul className="vp-locker">
          {sorted.map((stat) => {
            const sampleNote = outfitSampleNote(stat.games);
            const gamesLabel = `${stat.games} ${stat.games === 1 ? 'game' : 'games'}`;
            return (
              <li key={stat.outfit}>
                <button
                  type="button"
                  onClick={() => onViewOutfit(stat)}
                  aria-label={`${stat.outfit}, ${stat.wins}–${stat.losses} in ${gamesLabel}, ${stat.winRatePct} percent${sampleNote ? `, ${sampleNote}` : ''}`}
                  className={`vp-plate${selectedOutfit === stat.outfit ? ' is-selected' : ''}`}
                >
                  <span className="vp-plate-top">
                    <strong className="vp-plate-name">{stat.outfit}</strong>
                    <span className="vp-plate-record">{stat.wins}–{stat.losses}</span>
                  </span>
                  <span className="vp-ticket-meta">
                    {gamesLabel} · Last {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}
                    <span className="vp-plate-pct">{stat.winRatePct}%</span>
                  </span>
                  <span className="vp-bar" aria-hidden="true">
                    <span className={sampleNote ? 'is-small' : ''} style={{ width: `${stat.winRatePct}%` }} />
                  </span>
                  {sampleNote && <span className="vp-sample">{sampleNote}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default memo(VestLeaderboard);
