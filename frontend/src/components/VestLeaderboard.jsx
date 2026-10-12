import { memo, useState } from 'react';
import { formatLocationLabel, outfitSampleNote } from '../utils/vestTrackerMath';

function VestLeaderboard({ stats, selectedOutfit, onViewOutfit }) {
  const [sortBy, setSortBy] = useState('games');
  const sorted = [...stats].sort((a, b) => sortBy === 'rate'
    ? b.winRatePct - a.winRatePct || b.games - a.games
    : b.games - a.games || b.winRatePct - a.winRatePct);
  return (
    <section className="vt-card mb-6 overflow-hidden" aria-labelledby="vest-outfits-heading">
      <div className="vt-section-head flex-wrap gap-3">
        <h2 id="vest-outfits-heading" className="vt-label">Outfit records</h2>
        <div className="flex gap-1" role="group" aria-label="Sort outfit records">
          <button type="button" aria-pressed={sortBy === 'games'} onClick={() => setSortBy('games')} className={`vt-tab ${sortBy === 'games' ? 'is-active' : ''}`}>Most worn</button>
          <button type="button" aria-pressed={sortBy === 'rate'} onClick={() => setSortBy('rate')} className={`vt-tab ${sortBy === 'rate' ? 'is-active' : ''}`}>Win %</button>
        </div>
      </div>
      <p className="vt-mono text-xs px-5 py-3 text-[color:var(--vt-ink-mute)]">Completed games only. Select an outfit to see every game behind its record.</p>
      {!sorted.length ? <p className="px-5 pb-5 vt-mono">No outfit records yet.</p> : (
        <ul>
          {sorted.map((stat) => {
            const sampleNote = outfitSampleNote(stat.games);
            const gamesLabel = `${stat.games} ${stat.games === 1 ? 'game' : 'games'}`;
            return (
              <li key={stat.outfit}>
                <button
                  type="button"
                  onClick={() => onViewOutfit(stat)}
                  aria-label={`${stat.outfit}, ${stat.wins}–${stat.losses} in ${gamesLabel}, ${stat.winRatePct} percent${sampleNote ? `, ${sampleNote}` : ''}`}
                  className="vt-outfit-row"
                  style={selectedOutfit === stat.outfit ? { background: 'var(--vt-red-soft)' } : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="vt-display text-lg sm:text-xl block leading-tight">{stat.outfit}</strong>
                      <span className="vt-mono text-xs text-[color:var(--vt-ink-mute)]">{gamesLabel} · Last: {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}</span>
                    </div>
                    <div className="flex gap-4 shrink-0 text-right">
                      <div>
                        <span className="vt-label block">W–L</span>
                        <strong className="vt-display text-xl vt-tabular">{stat.wins}–{stat.losses}</strong>
                      </div>
                      <div>
                        <span className="vt-label block">Win %</span>
                        <strong className="vt-display text-xl vt-tabular">{stat.winRatePct}%</strong>
                      </div>
                    </div>
                  </div>
                  <span className="outfit-rate-track" aria-hidden="true">
                    <span className={`outfit-rate-fill${sampleNote ? ' is-small' : ''}`} style={{ width: `${stat.winRatePct}%` }} />
                  </span>
                  {sampleNote && <span className="outfit-sample-note vt-label">{sampleNote}</span>}
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
