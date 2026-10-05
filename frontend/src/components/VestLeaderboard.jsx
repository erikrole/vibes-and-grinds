import { memo, useState } from 'react';
import { formatLocationLabel } from '../utils/vestTrackerMath';

function VestLeaderboard({ stats, selectedOutfit, onViewOutfit }) {
  const [sortBy, setSortBy] = useState('games');
  const sorted = [...stats].sort((a, b) => sortBy === 'rate'
    ? b.winRatePct - a.winRatePct || b.games - a.games
    : b.games - a.games || b.winRatePct - a.winRatePct);
  return <section className="vt-card mb-6 overflow-hidden">
    <div className="vt-section-head flex-wrap gap-3"><span className="vt-label">Outfit records</span><div className="flex gap-1">
      <button type="button" aria-pressed={sortBy === 'games'} onClick={() => setSortBy('games')} className={`vt-tab ${sortBy === 'games' ? 'is-active' : ''}`}>Most worn</button>
      <button type="button" aria-pressed={sortBy === 'rate'} onClick={() => setSortBy('rate')} className={`vt-tab ${sortBy === 'rate' ? 'is-active' : ''}`}>Win %</button>
    </div></div>
    <p className="vt-mono text-xs px-5 py-3 text-[color:var(--vt-ink-mute)]">Completed games only. Select an outfit to see every game behind its record.</p>
    {!sorted.length ? <p className="p-5 vt-mono">No outfit records yet.</p> : <ul>{sorted.map(stat => <li key={stat.outfit}>
      <button type="button" onClick={() => onViewOutfit(stat)} aria-label={`View details for ${stat.outfit}`} className="w-full text-left px-4 sm:px-5 py-4 border-t border-[color:var(--vt-rule)] flex items-center gap-4" style={selectedOutfit === stat.outfit ? {background:'var(--vt-red-soft)'} : undefined}>
        <div className="min-w-0 flex-1"><strong className="vt-display text-lg block">{stat.outfit}</strong><span className="vt-mono text-xs text-[color:var(--vt-ink-mute)]">{stat.games} {stat.games === 1 ? 'game' : 'games'} · Last: {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}</span></div>
        <div className="text-right shrink-0"><span className="vt-label block">W–L</span><strong className="vt-display text-xl">{stat.wins}–{stat.losses}</strong></div>
        <div className="text-right shrink-0"><span className="vt-label block">Win %</span><strong className="vt-display text-xl">{stat.winRatePct}%</strong></div>
      </button>
    </li>)}</ul>}
  </section>;
}
export default memo(VestLeaderboard);
