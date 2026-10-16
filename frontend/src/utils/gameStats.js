// Box-score aggregates for the vest game-stats tab. No React.

function dateKey(value) {
  const text = String(value ?? '');
  return text.length >= 10 && text[4] === '-' ? text.slice(0, 10) : text;
}

function finiteScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function computeFunStats(games, vestGames = []) {
  if (!games.length) return null;

  const completed = [];
  for (const game of games) {
    const wisconsin = finiteScore(game.wisconsin_score);
    const opponent = finiteScore(game.opponent_score);
    if (wisconsin === null || opponent === null) continue;
    completed.push({ ...game, wisconsin_score: wisconsin, opponent_score: opponent });
  }
  if (!completed.length) return null;

  const outfitByDate = {};
  for (const vestGame of vestGames) {
    const key = dateKey(vestGame.date);
    if (key && vestGame.outfit) outfitByDate[key] = vestGame.outfit;
  }

  let totalWiScore = 0;
  let totalOppScore = 0;
  let biggestWin = null;
  let biggestWinMargin = 0;
  let closestGame = null;
  let closestMargin = Infinity;
  let biggestLoss = null;
  let biggestLossMargin = 0;
  let comebackWins = 0;
  let blownLeads = 0;
  let leadsAtHalf = 0;
  let trailsAtHalf = 0;
  let tiedAtHalf = 0;
  let winsWhenLeadingAtHalf = 0;
  let winsWhenTrailingAtHalf = 0;

  const broadcastStats = {};
  const outfitScoring = {};
  const playerPtsCount = {};
  const playerRebCount = {};
  const playerAstCount = {};
  const margins = [];

  for (const game of completed) {
    const wiScore = game.wisconsin_score;
    const oppScore = game.opponent_score;
    const margin = wiScore - oppScore;
    const isWin = margin > 0;
    const absMargin = Math.abs(margin);
    const date = dateKey(game.date);

    totalWiScore += wiScore;
    totalOppScore += oppScore;
    margins.push(margin);

    if (isWin && absMargin > biggestWinMargin) {
      biggestWinMargin = absMargin;
      biggestWin = game;
    }
    if (!isWin && margin < 0 && absMargin > biggestLossMargin) {
      biggestLossMargin = absMargin;
      biggestLoss = game;
    }
    if (absMargin < closestMargin) {
      closestMargin = absMargin;
      closestGame = game;
    }

    const homeHalf = finiteScore(game.wisconsin_h1);
    const awayHalf = finiteScore(game.opponent_h1);
    if (homeHalf !== null && awayHalf !== null) {
      const halfLead = homeHalf - awayHalf;
      if (halfLead > 0) {
        leadsAtHalf += 1;
        if (isWin) winsWhenLeadingAtHalf += 1;
        if (!isWin) blownLeads += 1;
      } else if (halfLead < 0) {
        trailsAtHalf += 1;
        if (isWin) {
          comebackWins += 1;
          winsWhenTrailingAtHalf += 1;
        }
      } else {
        tiedAtHalf += 1;
      }
    }

    if (game.broadcast) {
      if (!broadcastStats[game.broadcast]) broadcastStats[game.broadcast] = { wins: 0, losses: 0 };
      if (isWin) broadcastStats[game.broadcast].wins += 1;
      else broadcastStats[game.broadcast].losses += 1;
    }

    const outfit = outfitByDate[date] || game.outfit;
    if (outfit) {
      if (!outfitScoring[outfit]) outfitScoring[outfit] = { scored: 0, allowed: 0, games: 0 };
      outfitScoring[outfit].scored += wiScore;
      outfitScoring[outfit].allowed += oppScore;
      outfitScoring[outfit].games += 1;
    }

    if (game.wi_leader_pts_name) {
      playerPtsCount[game.wi_leader_pts_name] = (playerPtsCount[game.wi_leader_pts_name] || 0) + 1;
    }
    if (game.wi_leader_reb_name) {
      playerRebCount[game.wi_leader_reb_name] = (playerRebCount[game.wi_leader_reb_name] || 0) + 1;
    }
    if (game.wi_leader_ast_name) {
      playerAstCount[game.wi_leader_ast_name] = (playerAstCount[game.wi_leader_ast_name] || 0) + 1;
    }
  }

  const avgScored = Math.round((totalWiScore / completed.length) * 10) / 10;
  const avgAllowed = Math.round((totalOppScore / completed.length) * 10) / 10;
  const avgMargin = Math.round(((totalWiScore - totalOppScore) / completed.length) * 10) / 10;
  const blowouts = margins.filter((margin) => margin >= 15).length;
  const blowoutRate = Math.round((blowouts / completed.length) * 100);
  const nailBiters = margins.filter((margin) => Math.abs(margin) <= 5).length;

  const tvStats = Object.entries(broadcastStats)
    .map(([network, stats]) => ({
      network,
      ...stats,
      total: stats.wins + stats.losses,
      winRate: Math.round((stats.wins / (stats.wins + stats.losses)) * 100),
    }))
    .filter((stats) => stats.total >= 2)
    .sort((a, b) => b.winRate - a.winRate);

  const outfitScoringList = Object.entries(outfitScoring)
    .map(([outfit, stats]) => ({
      outfit,
      avgScored: Math.round((stats.scored / stats.games) * 10) / 10,
      avgAllowed: Math.round((stats.allowed / stats.games) * 10) / 10,
      avgMargin: Math.round(((stats.scored - stats.allowed) / stats.games) * 10) / 10,
      games: stats.games,
    }))
    .filter((stats) => stats.games >= 2)
    .sort((a, b) => b.avgMargin - a.avgMargin);

  const topScorer = Object.entries(playerPtsCount).sort((a, b) => b[1] - a[1])[0];
  const topRebounder = Object.entries(playerRebCount).sort((a, b) => b[1] - a[1])[0];
  const topAssist = Object.entries(playerAstCount).sort((a, b) => b[1] - a[1])[0];

  const outfitPlayerMap = {};
  for (const game of completed) {
    const outfit = outfitByDate[dateKey(game.date)] || game.outfit;
    if (!outfit || !game.wi_leader_pts_name) continue;
    if (!outfitPlayerMap[outfit]) outfitPlayerMap[outfit] = {};
    outfitPlayerMap[outfit][game.wi_leader_pts_name] = (outfitPlayerMap[outfit][game.wi_leader_pts_name] || 0) + 1;
  }
  const outfitPlayerCombos = Object.entries(outfitPlayerMap)
    .map(([outfit, players]) => {
      const [name, count] = Object.entries(players).sort((a, b) => b[1] - a[1])[0] || [];
      return { outfit, player: name, count };
    })
    .filter((combo) => combo.count >= 2)
    .sort((a, b) => b.count - a.count);

  return {
    gamesWithScores: completed.length,
    avgScored,
    avgAllowed,
    avgMargin,
    biggestWin,
    biggestWinMargin,
    biggestLoss,
    biggestLossMargin,
    closestGame,
    closestMargin,
    comebackWins,
    blownLeads,
    leadsAtHalf,
    trailsAtHalf,
    tiedAtHalf,
    winsWhenLeadingAtHalf,
    winsWhenTrailingAtHalf,
    blowouts,
    blowoutRate,
    nailBiters,
    tvStats,
    outfitScoringList,
    topScorer: topScorer ? { name: topScorer[0], count: topScorer[1] } : null,
    topRebounder: topRebounder ? { name: topRebounder[0], count: topRebounder[1] } : null,
    topAssist: topAssist ? { name: topAssist[0], count: topAssist[1] } : null,
    outfitPlayerCombos,
  };
}
