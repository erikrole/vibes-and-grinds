export function computeScoreStats(games, vestGames = []) {
  const saved = new Map(vestGames.map((game) => [String(game.espn_event_id), game]));
  const completed = games.filter((game) => game.wisconsin_score != null && game.opponent_score != null)
    .map((game) => {
      const owner = saved.get(String(game.espn_event_id));
      return owner ? { ...game, outfit: owner.outfit, location: owner.location, overtime: owner.overtime } : game;
    });
  if (!completed.length) return null;
  const average = (total, count) => Math.round(total / count * 10) / 10;
  const scored = completed.reduce((sum, game) => sum + game.wisconsin_score, 0);
  const allowed = completed.reduce((sum, game) => sum + game.opponent_score, 0);
  const outfits = new Map(), networks = new Map();
  const halftime = { games: 0, led: 0, trailed: 0, tied: 0 };
  for (const game of completed) {
    if (game.outfit) {
      const group = outfits.get(game.outfit) || { outfit: game.outfit, games: 0, scored: 0, allowed: 0 };
      group.games++; group.scored += game.wisconsin_score; group.allowed += game.opponent_score;
      outfits.set(game.outfit, group);
    }
    if (game.broadcast) {
      const group = networks.get(game.broadcast) || { network: game.broadcast, wins: 0, losses: 0 };
      if (game.wisconsin_score > game.opponent_score) group.wins++; else group.losses++;
      networks.set(game.broadcast, group);
    }
    if (game.wisconsin_h1 != null && game.opponent_h1 != null) {
      halftime.games++;
      if (game.wisconsin_h1 > game.opponent_h1) halftime.led++;
      else if (game.wisconsin_h1 < game.opponent_h1) halftime.trailed++;
      else halftime.tied++;
    }
  }
  return {
    completed,
    games: completed.length,
    avgScored: average(scored, completed.length),
    avgAllowed: average(allowed, completed.length),
    avgMargin: average(scored - allowed, completed.length),
    halftime,
    outfits: [...outfits.values()].map((group) => ({ ...group,
      avgScored: average(group.scored, group.games), avgAllowed: average(group.allowed, group.games),
      avgMargin: average(group.scored - group.allowed, group.games),
    })).sort((a, b) => b.games - a.games || a.outfit.localeCompare(b.outfit)),
    networks: [...networks.values()].sort((a, b) => b.wins + b.losses - a.wins - a.losses),
  };
}
