import { useEffect, useMemo, useState } from 'react';
import { fetchVestScores, fetchVestGameStats } from '../utils/api';
import { computeFunStats } from '../utils/gameStats';
import { locationSplits } from '../utils/vestTrackerMath';

const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).slice(0, 10).split('-');
  const month = MONTHS[parseInt(parts[1], 10) - 1];
  const day = parseInt(parts[2], 10);
  if (!month || !Number.isFinite(day)) return String(dateStr);
  return `${month} ${day}`;
};

const locLabel = (loc) => (loc === '@' ? '@ ' : loc === 'N' ? 'N ' : 'vs ');

// ── Stat card helpers ──

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${highlight ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-stone-200 bg-stone-50 dark:border-stone-600 dark:bg-stone-700/40'}`}>
      <p className="text-[10px] uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500 font-semibold">{label}</p>
      <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarStat({ label, wi, opp, format = 'pct' }) {
  const wiVal = typeof wi === 'number' ? wi : 0;
  const oppVal = typeof opp === 'number' ? opp : 0;
  const total = wiVal + oppVal || 1;
  const wiPct = (wiVal / total) * 100;
  const wiWins = format === 'pct' ? wiVal > oppVal : wiVal > oppVal;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-bold ${wiWins ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'}`}>
          {format === 'pct' ? `${wiVal}%` : wiVal}
        </span>
        <span className="text-stone-400 dark:text-stone-500 font-medium">{label}</span>
        <span className={`font-bold ${!wiWins ? 'text-stone-700 dark:text-stone-200' : 'text-stone-500 dark:text-stone-400'}`}>
          {format === 'pct' ? `${oppVal}%` : oppVal}
        </span>
      </div>
      <div className="h-2 rounded-full bg-stone-200 dark:bg-stone-600 overflow-hidden flex">
        <div className="h-full bg-red-500 rounded-l-full transition-all" style={{ width: `${wiPct}%` }} />
        <div className="h-full bg-stone-400 dark:bg-stone-500 rounded-r-full transition-all" style={{ width: `${100 - wiPct}%` }} />
      </div>
    </div>
  );
}

// ── Main Component ──

export default function GameStatsPanel({ games: vestGames }) {
  const [scoreData, setScoreData] = useState([]);
  const [scoreStatus, setScoreStatus] = useState('idle');
  const [expandedGame, setExpandedGame] = useState(null);
  const [gameDetail, setGameDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setScoreStatus('loading');

    fetchVestScores()
      .then((data) => {
        if (!cancelled) {
          setScoreData(Array.isArray(data.games) ? data.games : []);
          setScoreStatus('loaded');
        }
      })
      .catch(() => {
        if (!cancelled) setScoreStatus('error');
      });

    return () => { cancelled = true; };
  }, []);

  const funStats = useMemo(
    () => computeFunStats(scoreData, vestGames),
    [scoreData, vestGames]
  );

  const handleExpandGame = async (game) => {
    if (expandedGame === game.espn_event_id) {
      setExpandedGame(null);
      setGameDetail(null);
      return;
    }
    setExpandedGame(game.espn_event_id);
    setGameDetail(null);

    if (!game.espn_event_id) return;

    setDetailLoading(true);
    try {
      const { stats } = await fetchVestGameStats(game.espn_event_id);
      setGameDetail(stats);
    } catch {
      setGameDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (scoreStatus === 'loading') {
    return (
      <div className="text-center py-12">
        <span className="inline-block w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
        <span className="text-sm text-stone-500 dark:text-stone-400">Loading ESPN scores...</span>
      </div>
    );
  }

  if (scoreStatus === 'error') {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-stone-500 dark:text-stone-400">Unable to load ESPN scores. Try again later.</p>
      </div>
    );
  }

  if (!funStats) {
    return <LocalSeasonStats games={vestGames} scoreStatus={scoreStatus} />;
  }

  return (
    <div className="space-y-6">
      {/* Scoring Overview */}
      <section className="bg-neutral-900 text-neutral-100 border border-red-900/40 rounded-2xl p-5 sm:p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 font-semibold mb-3">Scoring Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Avg Scored" value={funStats.avgScored} highlight />
          <StatCard label="Avg Allowed" value={funStats.avgAllowed} />
          <StatCard label="Avg Margin" value={`${funStats.avgMargin > 0 ? '+' : ''}${funStats.avgMargin}`} highlight={funStats.avgMargin > 0} />
          <StatCard label="Games" value={funStats.gamesWithScores} />
        </div>
      </section>

      {/* Signature Games */}
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">Signature Games</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {funStats.biggestWin && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/60 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-400 font-semibold">Biggest Win</p>
              <p className="font-bold text-stone-900 dark:text-stone-100 mt-1">
                {locLabel(funStats.biggestWin.location)}{funStats.biggestWin.opponent}
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-300">
                {funStats.biggestWin.wisconsin_score}-{funStats.biggestWin.opponent_score}
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">(+{funStats.biggestWinMargin})</span>
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{formatDate(funStats.biggestWin.date)}</p>
            </div>
          )}
          {funStats.closestGame && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400 font-semibold">Nail-Biter</p>
              <p className="font-bold text-stone-900 dark:text-stone-100 mt-1">
                {locLabel(funStats.closestGame.location)}{funStats.closestGame.opponent}
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-300">
                {funStats.closestGame.wisconsin_score}-{funStats.closestGame.opponent_score}
                <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">({funStats.closestMargin === 0 ? 'TIE' : `${funStats.closestMargin} pt`})</span>
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{formatDate(funStats.closestGame.date)}</p>
            </div>
          )}
          {funStats.biggestLoss && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-red-600 dark:text-red-400 font-semibold">Toughest Loss</p>
              <p className="font-bold text-stone-900 dark:text-stone-100 mt-1">
                {locLabel(funStats.biggestLoss.location)}{funStats.biggestLoss.opponent}
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-300">
                {funStats.biggestLoss.wisconsin_score}-{funStats.biggestLoss.opponent_score}
                <span className="text-red-600 dark:text-red-400 font-semibold ml-1">(-{funStats.biggestLossMargin})</span>
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{formatDate(funStats.biggestLoss.date)}</p>
            </div>
          )}
        </div>
      </section>

      {/* Halftime Trends */}
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">Halftime Trends</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Lead at Half" value={funStats.leadsAtHalf} sub={funStats.leadsAtHalf ? `${funStats.winsWhenLeadingAtHalf}W closing` : null} />
          <StatCard label="Trail at Half" value={funStats.trailsAtHalf} sub={funStats.comebackWins ? `${funStats.comebackWins} comeback W` : null} highlight={funStats.comebackWins > 0} />
          <StatCard label="Blown Leads" value={funStats.blownLeads} sub={funStats.blownLeads ? 'Led at half, lost' : null} />
          <StatCard label="Nail-Biters" value={funStats.nailBiters} sub="Decided by 5 or less" />
        </div>
        {funStats.comebackWins > 0 && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">
            Win rate when trailing at halftime: {funStats.trailsAtHalf ? Math.round((funStats.winsWhenTrailingAtHalf / funStats.trailsAtHalf) * 100) : 0}%
          </p>
        )}
      </section>

      {/* TV Curse */}
      {funStats.tvStats.length > 0 && (
        <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">TV Curse</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">Does the broadcast matter?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {funStats.tvStats.map((tv) => (
              <div key={tv.network} className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800 dark:text-stone-100">{tv.network}</span>
                  <span className={`font-bold ${tv.winRate >= 60 ? 'text-emerald-600 dark:text-emerald-400' : tv.winRate <= 40 ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-300'}`}>
                    {tv.wins}W-{tv.losses}L
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-stone-200 dark:bg-stone-600 overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${tv.winRate}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${100 - tv.winRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Outfit Scoring */}
      {funStats.outfitScoringList.length > 0 && (
        <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">Outfit Scoring Power</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">Average points scored vs allowed per outfit</p>
          <div className="space-y-3">
            {funStats.outfitScoringList.map((o) => (
              <div key={o.outfit} className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-stone-900 dark:text-stone-100">{o.outfit}</span>
                  <span className={`text-sm font-bold ${o.avgMargin > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {o.avgMargin > 0 ? '+' : ''}{o.avgMargin} avg margin
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-stone-600 dark:text-stone-300">
                  <span>{o.avgScored} PPG</span>
                  <span className="text-stone-400">|</span>
                  <span>{o.avgAllowed} opp PPG</span>
                  <span className="text-stone-400">|</span>
                  <span className="text-xs text-stone-400">{o.games} games</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Player Spotlight */}
      {(funStats.topScorer || funStats.topRebounder || funStats.topAssist) && (
        <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">Player Spotlight</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {funStats.topScorer && (
              <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.1em] text-stone-400 font-semibold">Top Scorer</p>
                <p className="font-bold text-stone-900 dark:text-stone-100 mt-1">{funStats.topScorer.name}</p>
                <p className="text-xs text-stone-500">Led scoring {funStats.topScorer.count}x</p>
              </div>
            )}
            {funStats.topRebounder && (
              <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.1em] text-stone-400 font-semibold">Top Rebounder</p>
                <p className="font-bold text-stone-900 dark:text-stone-100 mt-1">{funStats.topRebounder.name}</p>
                <p className="text-xs text-stone-500">Led rebounds {funStats.topRebounder.count}x</p>
              </div>
            )}
            {funStats.topAssist && (
              <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.1em] text-stone-400 font-semibold">Top Facilitator</p>
                <p className="font-bold text-stone-900 dark:text-stone-100 mt-1">{funStats.topAssist.name}</p>
                <p className="text-xs text-stone-500">Led assists {funStats.topAssist.count}x</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Outfit + Player Combos */}
      {funStats.outfitPlayerCombos.length > 0 && (
        <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">Outfit + Player Combos</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">Who goes off in each outfit?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {funStats.outfitPlayerCombos.map((c) => (
              <div key={c.outfit} className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm">
                <span className="font-semibold text-stone-800 dark:text-stone-100">{c.outfit}</span>
                <span className="text-stone-400 mx-1">=</span>
                <span className="text-red-600 dark:text-red-400 font-bold">{c.player}</span>
                <span className="text-xs text-stone-400 ml-1">({c.count}x top scorer)</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Game-by-Game Scores */}
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">Game-by-Game Results</h3>
        <div className="space-y-2">
          {[...scoreData].reverse().filter((g) => g.wisconsin_score != null).map((game) => {
            const margin = game.wisconsin_score - game.opponent_score;
            const isWin = margin > 0;
            const isExpanded = expandedGame === game.espn_event_id;

            return (
              <div key={game.espn_event_id || game.id}>
                <button
                  onClick={() => handleExpandGame(game)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-md ${
                    isWin
                      ? 'bg-emerald-50/50 border-emerald-200/80 dark:bg-emerald-900/10 dark:border-emerald-800/40'
                      : 'bg-red-50/50 border-red-200/80 dark:bg-red-900/10 dark:border-red-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isWin ? 'bg-emerald-200/60 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300'
                        : 'bg-red-200/60 text-red-700 dark:bg-red-800/50 dark:text-red-300'
                      }`}>
                        {isWin ? 'W' : 'L'}
                      </span>
                      <div>
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {locLabel(game.location)}{game.opponent}
                        </span>
                        <span className="text-xs text-stone-400 dark:text-stone-500 ml-2">{formatDate(game.date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-stone-900 dark:text-stone-100">
                        {game.wisconsin_score}-{game.opponent_score}
                      </span>
                      {game.ot_periods > 0 && (
                        <span className="text-xs text-stone-400 ml-1">
                          {game.ot_periods === 1 ? 'OT' : `${game.ot_periods}OT`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {game.outfit && <span>{game.outfit}</span>}
                    {game.broadcast && <><span className="text-stone-300 dark:text-stone-600">|</span><span>{game.broadcast}</span></>}
                    {game.venue && <><span className="text-stone-300 dark:text-stone-600">|</span><span>{game.venue}</span></>}
                    {game.wisconsin_h1 != null && (
                      <><span className="text-stone-300 dark:text-stone-600">|</span><span>Half: {game.wisconsin_h1}-{game.opponent_h1}, {game.wisconsin_h2}-{game.opponent_h2}</span></>
                    )}
                  </div>
                </button>

                {/* Expanded box score */}
                {isExpanded && (
                  <div className="mt-1 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700/30 p-4">
                    {detailLoading ? (
                      <div className="text-center py-4">
                        <span className="inline-block w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                        <span className="text-xs text-stone-500">Loading box score...</span>
                      </div>
                    ) : gameDetail?.wi_fg ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-600 pb-2">
                          <span className="text-red-600 dark:text-red-400">Wisconsin</span>
                          <span>Opponent</span>
                        </div>
                        <BarStat label="FG%" wi={gameDetail.wi_fg_pct} opp={gameDetail.opp_fg_pct} />
                        <BarStat label="3PT%" wi={gameDetail.wi_3pt_pct} opp={gameDetail.opp_3pt_pct} />
                        <BarStat label="FT%" wi={gameDetail.wi_ft_pct} opp={gameDetail.opp_ft_pct} />
                        <BarStat label="REB" wi={gameDetail.wi_rebounds} opp={gameDetail.opp_rebounds} format="num" />
                        <BarStat label="TO" wi={gameDetail.opp_turnovers} opp={gameDetail.wi_turnovers} format="num" />

                        {(gameDetail.wi_leader_pts_name || gameDetail.wi_leader_reb_name || gameDetail.wi_leader_ast_name) && (
                          <div className="border-t border-stone-200 dark:border-stone-600 pt-3 mt-3">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-stone-400 font-semibold mb-2">Wisconsin Leaders</p>
                            <div className="flex flex-wrap gap-3 text-sm">
                              {gameDetail.wi_leader_pts_name && (
                                <span><span className="font-bold text-stone-900 dark:text-stone-100">{gameDetail.wi_leader_pts_name}</span> <span className="text-stone-500">{gameDetail.wi_leader_pts_value} pts</span></span>
                              )}
                              {gameDetail.wi_leader_reb_name && (
                                <span><span className="font-bold text-stone-900 dark:text-stone-100">{gameDetail.wi_leader_reb_name}</span> <span className="text-stone-500">{gameDetail.wi_leader_reb_value} reb</span></span>
                              )}
                              {gameDetail.wi_leader_ast_name && (
                                <span><span className="font-bold text-stone-900 dark:text-stone-100">{gameDetail.wi_leader_ast_name}</span> <span className="text-stone-500">{gameDetail.wi_leader_ast_value} ast</span></span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 text-center py-2">Box score not available for this game.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function LocalSeasonStats({ games, scoreStatus }) {
  const completed = games.filter((game) => game.result === 'W' || game.result === 'L');
  const wins = completed.filter((game) => game.result === 'W').length;
  const splits = locationSplits(games);
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
        <p className="vt-mono text-xs text-[color:var(--vt-ink-mute)] mt-4">Box-score enrichment is {scoreStatus === 'error' ? 'temporarily unavailable' : 'not available for this season'}, so these stats use the trusted Vest game log.</p>
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
