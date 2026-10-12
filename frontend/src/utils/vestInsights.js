// Season-line, outfit, and coffee-journal reads for the Vest tracker.
// Joins are computed from records already loaded. Nothing here writes.

const completed = (games) => (games || []).filter((game) => game.result === 'W' || game.result === 'L');

export function recordOf(games) {
  const rows = completed(games);
  const wins = rows.filter((game) => game.result === 'W').length;
  return { wins, losses: rows.length - wins, games: rows.length };
}

export function streakSummary(results) {
  if (!results?.length) return { current: null, longestWin: 0, longestLoss: 0 };
  const last = results[results.length - 1];
  let count = 0;
  for (let i = results.length - 1; i >= 0; i -= 1) {
    if (results[i] === last) count += 1;
    else break;
  }
  const longest = (target) => {
    let best = 0;
    let run = 0;
    for (const result of results) {
      run = result === target ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  };
  return { current: { result: last, count }, longestWin: longest('W'), longestLoss: longest('L') };
}

export function locationRecord(games) {
  const bucket = (location) => recordOf((games || []).filter((game) => (game.location || 'vs') === location));
  return { home: bucket('vs'), away: bucket('@'), neutral: bucket('N') };
}

export function rankedRecord(games) {
  return recordOf((games || []).filter((game) => Number(game.ranking) > 0));
}

const scoreKey = (game) => String(game.game_id ?? game.id ?? '');

export function indexScores(scores) {
  const byId = new Map();
  for (const row of scores || []) {
    const key = scoreKey(row);
    if (key) byId.set(key, row);
  }
  return byId;
}

export function marginsFor(games, scores) {
  const byId = scores instanceof Map ? scores : indexScores(scores);
  const margins = [];
  for (const game of games || []) {
    const row = byId.get(String(game.id));
    if (row?.wisconsin_score == null || row?.opponent_score == null) continue;
    margins.push(Number(row.wisconsin_score) - Number(row.opponent_score));
  }
  if (!margins.length) return null;
  const total = margins.reduce((sum, margin) => sum + margin, 0);
  return {
    games: margins.length,
    avg: Math.round((total / margins.length) * 10) / 10,
    best: Math.max(...margins),
    worst: Math.min(...margins),
  };
}

export function buildOutfitBriefs(games, scores) {
  const groups = new Map();
  for (const game of completed(games)) {
    if (!game.outfit) continue;
    if (!groups.has(game.outfit)) groups.set(game.outfit, []);
    groups.get(game.outfit).push(game);
  }
  return [...groups.entries()].map(([outfit, rows]) => {
    const record = recordOf(rows);
    const splits = locationRecord(rows);
    const ranked = rankedRecord(rows);
    const streak = streakSummary(rows.map((game) => game.result));
    const margin = marginsFor(rows, scores);
    return {
      outfit,
      ...record,
      winRatePct: record.games ? Math.round((record.wins / record.games) * 100) : 0,
      results: rows.map((game) => game.result),
      streak,
      home: splits.home,
      away: splits.away,
      neutral: splits.neutral,
      roadWins: splits.away.wins,
      roadLosses: splits.away.losses,
      ranked,
      margin,
      lastSeen: rows[rows.length - 1]?.opponent || '',
      lastSeenLocation: rows[rows.length - 1]?.location || 'vs',
    };
  });
}

// Best win rate among outfits with at least three games.
// One- and two-game hot starts stay out of the label.
export function luckyOutfit(briefs) {
  const pool = (briefs || []).filter((brief) => brief.games >= 3);
  if (!pool.length) return null;
  const ranked = [...pool].sort((a, b) => (
    (b.wins / b.games) - (a.wins / a.games)
    || (b.margin?.avg ?? -999) - (a.margin?.avg ?? -999)
    || b.games - a.games
    || a.outfit.localeCompare(b.outfit)
  ));
  const top = ranked[0];
  return { ...top, smallSample: top.games <= 3 };
}

export function buildHalftimeSplit(scores) {
  const rows = (scores || []).filter((row) => (
    row.wisconsin_h1 != null && row.opponent_h1 != null
    && row.wisconsin_score != null && row.opponent_score != null
  ));
  if (!rows.length) return null;
  const split = {
    games: rows.length,
    ledWon: 0,
    ledLost: 0,
    trailedWon: 0,
    trailedLost: 0,
    tiedWon: 0,
    tiedLost: 0,
  };
  for (const row of rows) {
    const half = Math.sign(Number(row.wisconsin_h1) - Number(row.opponent_h1));
    const won = Number(row.wisconsin_score) > Number(row.opponent_score);
    if (half > 0) won ? split.ledWon += 1 : split.ledLost += 1;
    else if (half < 0) won ? split.trailedWon += 1 : split.trailedLost += 1;
    else won ? split.tiedWon += 1 : split.tiedLost += 1;
  }
  return split;
}

const visitDate = (visit) => String(visit?.date || visit?.visitDate || '').slice(0, 10);

export function buildCoffeeBrief(visits, games, scores) {
  const done = completed(games);
  if (!done.length || !visits?.length) return null;
  const byDate = new Map();
  for (const visit of visits) {
    const date = visitDate(visit);
    if (!date || !visit.coffee_shop_name) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({
      shop: visit.coffee_shop_name,
      order: (visit.coffee_order || '').trim(),
      city: visit.city || '',
    });
  }
  const withCoffee = [];
  const without = [];
  for (const game of done) {
    const stops = byDate.get(game.date) || [];
    if (stops.length) withCoffee.push({ game, stops });
    else without.push(game);
  }
  if (!withCoffee.length) return null;

  const withRecord = recordOf(withCoffee.map((entry) => entry.game));
  const withoutRecord = recordOf(without);
  const homeCoffee = withCoffee.filter((entry) => entry.game.location === 'vs').length;
  const orders = new Map();
  for (const entry of withCoffee) {
    const seen = new Set();
    for (const stop of entry.stops) {
      if (!stop.order || seen.has(stop.order)) continue;
      seen.add(stop.order);
      const stat = orders.get(stop.order) || { order: stop.order, wins: 0, losses: 0, games: 0 };
      stat.games += 1;
      if (entry.game.result === 'W') stat.wins += 1;
      else stat.losses += 1;
      orders.set(stop.order, stat);
    }
  }
  const repeatOrder = [...orders.values()]
    .filter((stat) => stat.games >= 2)
    .sort((a, b) => b.games - a.games || (b.wins / b.games) - (a.wins / a.games) || a.order.localeCompare(b.order))[0] || null;
  const shops = new Map();
  for (const entry of withCoffee) {
    for (const stop of entry.stops) shops.set(stop.shop, (shops.get(stop.shop) || 0) + 1);
  }
  const repeatShop = [...shops.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    days: withCoffee.length,
    stops: withCoffee.reduce((sum, entry) => sum + entry.stops.length, 0),
    withRecord,
    withoutRecord,
    withMargin: marginsFor(withCoffee.map((entry) => entry.game), scores),
    withoutMargin: marginsFor(without, scores),
    homeCoffee,
    awayOrNeutral: withCoffee.length - homeCoffee,
    repeatOrder,
    repeatShop: repeatShop ? { shop: repeatShop[0], games: repeatShop[1] } : null,
    byDate: Object.fromEntries(withCoffee.map((entry) => [entry.game.date, entry.stops])),
  };
}
