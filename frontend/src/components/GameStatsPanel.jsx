import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchVestScores, fetchVestGameStats } from '../utils/api';
import { computeScoreStats } from '../utils/scoreStats';
import { formatDate } from '../utils/dates';

const locationLabel = (location) => location === '@' ? 'at ' : location === 'N' ? 'neutral vs ' : 'vs ';
const signed = (value) => `${value > 0 ? '+' : ''}${value}`;
const boxRows = [
  ['Field goals', 'wi_fg', 'opp_fg'],
  ['Three-pointers', 'wi_3pt', 'opp_3pt'],
  ['Free throws', 'wi_ft', 'opp_ft'],
  ['Rebounds', 'wi_rebounds', 'opp_rebounds'],
  ['Turnovers', 'wi_turnovers', 'opp_turnovers'],
];

export default function GameStatsPanel({ games: vestGames }) {
  const [scoreData, setScoreData] = useState([]);
  const [scoreStatus, setScoreStatus] = useState('loading');
  const [scoreSource, setScoreSource] = useState('espn');
  const [expandedGame, setExpandedGame] = useState(null);
  const [gameDetail, setGameDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setExpandedGame(null);
    setGameDetail(null);
    setDetailLoading(false);
    setScoreStatus('loading');
    fetchVestScores().then((data) => {
      if (cancelled) return;
      setScoreData(Array.isArray(data.games) ? data.games : []);
      setScoreSource(data.source);
      setScoreStatus('loaded');
    }).catch(() => { if (!cancelled) setScoreStatus('error'); });
    return () => { cancelled = true; detailRequest.current++; };
  }, [vestGames]);

  const stats = useMemo(() => computeScoreStats(scoreData, vestGames), [scoreData, vestGames]);
  const handleExpand = async (game) => {
    const request = ++detailRequest.current;
    setGameDetail(null);
    if (expandedGame === game.espn_event_id) {
      setExpandedGame(null);
      setDetailLoading(false);
      return;
    }
    setExpandedGame(game.espn_event_id);
    setDetailLoading(true);
    try {
      const { stats: detail } = await fetchVestGameStats(game.espn_event_id);
      if (detailRequest.current === request) setGameDetail(detail);
    } catch { /* Keep the saved final score visible when enrichment is unavailable. */ }
    finally { if (detailRequest.current === request) setDetailLoading(false); }
  };

  if (scoreStatus === 'loading') {
    return <p role="status" className="vt-card p-6 text-sm text-[color:var(--vt-ink-dim)]">Loading ESPN scores…</p>;
  }
  if (scoreStatus === 'error' || !stats) return <LocalSeasonStats games={vestGames} scoreStatus={scoreStatus} />;

  return (
    <div className="space-y-6">
      <section className="vt-card vt-rail-top p-5 sm:p-6" aria-labelledby="scoring-overview">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 id="scoring-overview" className="vt-label vt-label-red">Scoring overview</h2>
          <span className="text-xs text-[color:var(--vt-ink-mute)]">{scoreSource === 'cache' ? 'Saved ESPN scores' : 'ESPN final scores'}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <LocalMetric label="Points scored / game" value={stats.avgScored} />
          <LocalMetric label="Points allowed / game" value={stats.avgAllowed} />
          <LocalMetric label="Average margin" value={signed(stats.avgMargin)} />
          <LocalMetric label="Games with scores" value={stats.games} />
        </div>
      </section>

      <section className="vt-card overflow-hidden" aria-labelledby="score-results">
        <div className="vt-section-head"><h2 id="score-results" className="vt-label">Game results</h2><span className="text-xs text-[color:var(--vt-ink-mute)]">Newest first</span></div>
        <p className="px-5 py-3 text-xs text-[color:var(--vt-ink-dim)]">Select a game for its box score. Wisconsin’s score is listed first.</p>
        {[...stats.completed].reverse().map((game) => {
          const expanded = expandedGame === game.espn_event_id;
          const win = game.wisconsin_score > game.opponent_score;
          return (
            <div key={game.espn_event_id} className="border-t border-[color:var(--vt-rule)]">
              <button onClick={() => handleExpand(game)} aria-expanded={expanded} aria-controls={`box-${game.espn_event_id}`}
                className="w-full p-4 sm:px-5 text-left hover:bg-[color:var(--vt-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--vt-red-hot)]">
                <div className="flex items-start gap-3">
                  <span className={`vt-mono text-xs mt-1 ${win ? 'text-[color:var(--vt-ink)]' : 'text-[color:var(--vt-ink-mute)]'}`}>{win ? 'W' : 'L'}</span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm text-[color:var(--vt-ink)]">{locationLabel(game.location)}{game.opponent}</strong>
                    <span className="block text-xs text-[color:var(--vt-ink-mute)] mt-1">{formatDate(game.date)}{game.outfit ? ` · ${game.outfit}` : ''}</span>
                  </div>
                  <span className="shrink-0 text-right">
                    <strong className="vt-mono text-sm sm:text-base text-[color:var(--vt-ink)]">{game.wisconsin_score}–{game.opponent_score}</strong>
                    {(game.ot_periods > 0 || game.overtime) && <span className="block text-xs text-[color:var(--vt-ink-mute)]">{game.ot_periods > 1 ? `${game.ot_periods}OT` : 'OT'}</span>}
                  </span>
                </div>
                {(game.venue || game.broadcast) && <p className="text-xs text-[color:var(--vt-ink-mute)] mt-2 pl-5">{[game.venue, game.broadcast].filter(Boolean).join(' · ')}</p>}
              </button>
              <div id={`box-${game.espn_event_id}`} hidden={!expanded} className="px-4 pb-4 sm:px-5">
                {detailLoading ? <p role="status" className="text-sm text-[color:var(--vt-ink-dim)]">Loading box score…</p> : gameDetail?.wi_fg ? (
                  <table className="w-full text-sm vt-card-inset">
                    <caption className="sr-only">{game.opponent} game box score</caption>
                    <thead><tr className="text-xs text-[color:var(--vt-ink-mute)]"><th scope="col" className="p-3 text-left">Stat</th><th scope="col" className="p-3 text-right">Wisconsin</th><th scope="col" className="p-3 text-right">Opponent</th></tr></thead>
                    <tbody>{boxRows.map(([label, wi, opp]) => <tr key={label} className="border-t border-[color:var(--vt-rule)]"><th scope="row" className="px-3 py-2 text-left font-medium text-[color:var(--vt-ink-dim)]">{label}</th><td className="px-3 py-2 text-right vt-mono">{gameDetail[wi] ?? '—'}</td><td className="px-3 py-2 text-right vt-mono">{gameDetail[opp] ?? '—'}</td></tr>)}</tbody>
                  </table>
                ) : <p className="text-sm text-[color:var(--vt-ink-dim)]">Box score is unavailable for this game.</p>}
              </div>
            </div>
          );
        })}
      </section>

      <section className="vt-card overflow-hidden" aria-labelledby="outfit-scoring">
        <div className="vt-section-head"><h2 id="outfit-scoring" className="vt-label">Scoring by outfit</h2></div>
        <p className="px-5 pt-3 text-xs text-[color:var(--vt-ink-dim)]">Completed games only. Outfit records describe the games worn.</p>
        <div className="grid sm:grid-cols-2 p-3 gap-2">
          {stats.outfits.map((outfit) => <div key={outfit.outfit} className="vt-card-inset p-3">
            <div className="flex justify-between gap-3"><strong className="text-sm">{outfit.outfit}</strong><span className="shrink-0 text-xs text-[color:var(--vt-ink-mute)]">{outfit.games} {outfit.games === 1 ? 'game' : 'games'}</span></div>
            <p className="text-xs text-[color:var(--vt-ink-dim)] mt-2">{outfit.avgScored} scored · {outfit.avgAllowed} allowed per game</p>
            <p className="vt-mono text-xs mt-1">{signed(outfit.avgMargin)} average margin</p>
          </div>)}
        </div>
      </section>

      {(stats.networks.length > 0 || stats.halftime.games > 0) && <details className="vt-card p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold">More game stats</summary>
        {stats.halftime.games > 0 && <section className="mt-5">
          <h3 className="vt-label">Halftime records</h3>
          <p className="text-xs text-[color:var(--vt-ink-mute)] mt-2">Available for {stats.halftime.games} of {stats.games} games.</p>
          <p className="text-sm mt-2">Led: {stats.halftime.led} · Trailed: {stats.halftime.trailed} · Tied: {stats.halftime.tied}</p>
        </section>}
        {stats.networks.length > 0 && <section className="mt-5">
          <h3 className="vt-label">Record by broadcast</h3>
          <div className="mt-2">{stats.networks.map((network) => <p key={network.network} className="flex justify-between gap-3 text-sm border-b last:border-b-0 border-[color:var(--vt-rule)] py-2"><span>{network.network}</span><span className="vt-mono">{network.wins}–{network.losses}</span></p>)}</div>
        </section>}
      </details>}
    </div>
  );
}

function LocalSeasonStats({ games, scoreStatus }) {
  const completed = games.filter((game) => game.result === 'W' || game.result === 'L');
  const wins = completed.filter((game) => game.result === 'W').length;
  const splits = [
    ['Home', 'vs'],
    ['Road', '@'],
    ['Neutral', 'N'],
  ].map(([label, location]) => {
    const subset = completed.filter((game) => game.location === location);
    const subsetWins = subset.filter((game) => game.result === 'W').length;
    return { label, wins: subsetWins, losses: subset.length - subsetWins };
  });
  const recent = completed.slice(-10).reverse();
  const outfitCounts = Object.entries(completed.reduce((counts, game) => {
    if (game.outfit) counts[game.outfit] = (counts[game.outfit] || 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="vt-card vt-rail-top p-5 sm:p-6">
        <p className="vt-label vt-label-red">Season Stats</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <LocalMetric label="Record" value={`${wins}–${completed.length - wins}`} />
          <LocalMetric label="Win rate" value={completed.length ? `${Math.round((wins / completed.length) * 100)}%` : '—'} />
          <LocalMetric label="Games logged" value={completed.length} />
          <LocalMetric label="Outfits worn" value={new Set(completed.map((game) => game.outfit).filter(Boolean)).size} />
        </div>
        <p className="text-xs text-[color:var(--vt-ink-mute)] mt-4">ESPN scores are {scoreStatus === 'error' ? 'temporarily unavailable' : 'not available for this season'}. These records use your saved games.</p>
      </section>
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="vt-card overflow-hidden">
          <div className="vt-section-head"><span className="vt-label">Location splits</span></div>
          {splits.map((split) => <div key={split.label} className="flex justify-between px-5 py-3 border-b last:border-b-0 border-[color:var(--vt-rule)]"><span className="vt-condensed uppercase text-[color:var(--vt-ink-dim)]">{split.label}</span><strong className="vt-display text-xl vt-tabular">{split.wins}–{split.losses}</strong></div>)}
        </section>
        <section className="vt-card overflow-hidden">
          <div className="vt-section-head"><span className="vt-label">Most worn</span></div>
          {outfitCounts.map(([outfit, count]) => <div key={outfit} className="flex justify-between px-5 py-3 border-b last:border-b-0 border-[color:var(--vt-rule)]"><span className="vt-condensed uppercase text-[color:var(--vt-ink-dim)]">{outfit}</span><strong className="vt-display text-xl vt-tabular">{count}</strong></div>)}
        </section>
      </div>
      <section className="vt-card overflow-hidden">
        <div className="vt-section-head"><span className="vt-label">Last 10</span><span className="vt-mono text-[10px] text-[color:var(--vt-ink-faint)]">Newest first</span></div>
        <div className="flex flex-wrap gap-2 p-5">{recent.map((game) => <span key={game.id} className={`w-9 h-9 grid place-items-center rounded border vt-display ${game.result === 'W' ? 'text-[color:var(--vt-red)] border-[color:var(--vt-red)]' : 'text-[color:var(--vt-ink-mute)] border-[color:var(--vt-rule-strong)]'}`} title={`${game.result} ${game.opponent}`}>{game.result}</span>)}</div>
      </section>
    </div>
  );
}

function LocalMetric({ label, value }) {
  return <div className="vt-card-inset p-3"><span className="vt-label text-[10px] block">{label}</span><strong className="vt-display text-3xl vt-tabular block mt-1">{value}</strong></div>;
}
