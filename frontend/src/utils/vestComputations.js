// Pure derivations for the Vest Tracker dashboard. Given the raw games array
// (and an optional NET lookup), produce the various sliced/summarized views
// the UI renders. Splitting these out lets us memoize them in the component
// and unit-test the algorithms in isolation.

import {
  countTrailingStreak,
  findNetRankForOpponent,
  formatLocationLabel,
  getQuadrant,
  getQuadrantQualityScore,
  toIsoDate,
} from './vestStats';

export function sortGames(games) {
  return [...games].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

export function getCompletedGames(sortedGames) {
  return sortedGames.filter((game) => game.result === 'W' || game.result === 'L');
}

export function getOutfits(completedGames) {
  return ['All outfits', ...new Set(completedGames.filter((g) => g.outfit).map((g) => g.outfit))];
}

export function getExistingOutfits(games) {
  return [...new Set(games.filter((g) => g.outfit).map((g) => g.outfit))].sort();
}

export function getVisibleGames(sortedGames, selectedOutfit) {
  const base = selectedOutfit === 'All outfits'
    ? sortedGames
    : sortedGames.filter((game) => game.outfit === selectedOutfit);
  return [...base].reverse();
}

export function getSummary(completedGames, selectedOutfit) {
  const sourceGames = selectedOutfit === 'All outfits'
    ? completedGames
    : completedGames.filter((game) => game.outfit === selectedOutfit);
  const wins = sourceGames.filter((game) => game.result === 'W').length;
  const losses = sourceGames.length - wins;
  return { wins, losses };
}

/**
 * Per-outfit aggregate stats: wins, losses, road record, OT record, NET avg,
 * quadrant breakdown, recent form. completedGames must already be sorted.
 */
export function computeOutfitStats(completedGames, netLookup) {
  const grouped = completedGames
    .filter((game) => game.outfit)
    .reduce((acc, game, index) => {
      if (!acc[game.outfit]) {
        acc[game.outfit] = {
          outfit: game.outfit,
          wins: 0,
          losses: 0,
          games: 0,
          lastSeen: game.opponent,
          lastSeenLocation: game.location || 'vs',
          lastIndex: index,
          recentResults: [],
          roadWins: 0,
          roadLosses: 0,
          otWins: 0,
          otLosses: 0,
          netRankSum: 0,
          netRankCount: 0,
          quadrants: {
            1: { wins: 0, losses: 0 },
            2: { wins: 0, losses: 0 },
            3: { wins: 0, losses: 0 },
            4: { wins: 0, losses: 0 },
          },
        };
      }

      const o = acc[game.outfit];
      o.games += 1;
      o.lastSeen = game.opponent;
      o.lastSeenLocation = game.location || 'vs';
      o.lastIndex = index;
      o.recentResults.push(game.result);
      if (game.result === 'W') o.wins += 1;
      if (game.result === 'L') o.losses += 1;

      if (game.location === '@') {
        if (game.result === 'W') o.roadWins += 1;
        if (game.result === 'L') o.roadLosses += 1;
      }
      if (game.overtime) {
        if (game.result === 'W') o.otWins += 1;
        if (game.result === 'L') o.otLosses += 1;
      }

      const netRank = findNetRankForOpponent(netLookup, game.opponent);
      if (Number.isFinite(netRank)) {
        o.netRankSum += netRank;
        o.netRankCount += 1;
      }
      const quadrant = getQuadrant(game.location, netRank);
      if (quadrant && (game.result === 'W' || game.result === 'L')) {
        if (game.result === 'W') o.quadrants[quadrant].wins += 1;
        if (game.result === 'L') o.quadrants[quadrant].losses += 1;
      }

      return acc;
    }, {});

  return Object.values(grouped)
    .map((entry) => {
      const last3 = entry.recentResults.slice(-3);
      let form = null;
      if (last3.length >= 2 && last3.every((r) => r === 'W')) form = 'hot';
      else if (last3.length >= 2 && last3.every((r) => r === 'L')) form = 'cold';

      return {
        ...entry,
        winRate: Math.round((entry.wins / entry.games) * 100),
        avgNet: entry.netRankCount ? Math.round(entry.netRankSum / entry.netRankCount) : null,
        form,
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
}

/**
 * Pick the best outfit recommendation. Excludes the most recently worn
 * outfit, ranks the rest by win rate + recency + clutch + quadrant quality.
 */
export function computeRecommendation(completedGames, outfitStats) {
  if (!completedGames.length || outfitStats.length < 2) return null;

  const lastOutfit = completedGames[completedGames.length - 1]?.outfit;
  const candidates = outfitStats.filter((entry) => entry.outfit !== lastOutfit);
  if (!candidates.length) return null;

  const scored = candidates
    .map((entry) => {
      const recencyDistance = completedGames.length - entry.lastIndex;
      const recencyBonus = Math.min(10, recencyDistance * 1.2);
      const samplePenalty = entry.games < 2 ? 8 : entry.games < 4 ? 4 : 0;
      const clutchBoost = entry.form === 'hot' ? 6 : entry.form === 'cold' ? -4 : 0;
      const quadrantScore = getQuadrantQualityScore(entry.quadrants);
      const highTierGames =
        entry.quadrants[1].wins +
        entry.quadrants[1].losses +
        entry.quadrants[2].wins +
        entry.quadrants[2].losses;
      const highTierConfidence = Math.min(8, highTierGames * 1.5);

      const score =
        entry.winRate +
        entry.wins * 3 +
        recencyBonus +
        clutchBoost +
        quadrantScore +
        highTierConfidence -
        samplePenalty;

      return {
        ...entry,
        score: Math.round(score),
        quadrantScore,
        highTierGames,
        recencyDistance,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    top: scored[0],
    alternatives: scored.slice(1, 3),
    blockedOutfit: lastOutfit,
  };
}

export function computeOutfitBadges(outfitStats) {
  const badges = {};
  for (const stat of outfitStats) {
    const b = [];
    const s = countTrailingStreak(stat.recentResults);
    if (s && s.count >= 3 && s.result === 'W') b.push(`${s.count}-Game Heater`);
    else if (s && s.count >= 3 && s.result === 'L') b.push(`${s.count}-Game Skid`);
    if (stat.roadWins >= 3) b.push(`Road Warrior (${stat.roadWins}-${stat.roadLosses} away)`);
    if (stat.quadrants[1].wins >= 2) b.push(`Q1 Slayer (${stat.quadrants[1].wins}-${stat.quadrants[1].losses})`);
    if (stat.games >= 3 && stat.losses === 0) b.push('Undefeated');
    if (stat.otWins >= 2) b.push(`OT Specialist (${stat.otWins}-${stat.otLosses})`);
    if (b.length) badges[stat.outfit] = b;
  }
  return badges;
}

export function computeJinxAlert(recommendation, sortedGames, netLookup, outfitStats) {
  if (!recommendation) return null;
  const upcoming = sortedGames.find((g) => !g.result || (g.result !== 'W' && g.result !== 'L'));
  if (!upcoming) return null;

  const topOutfit = recommendation.top.outfit;
  const netRank = findNetRankForOpponent(netLookup, upcoming.opponent);
  const quadrant = getQuadrant(upcoming.location || 'vs', netRank);
  if (!quadrant) return null;

  const topStats = outfitStats.find((s) => s.outfit === topOutfit);
  if (!topStats) return null;

  const qGames = topStats.quadrants[quadrant].wins + topStats.quadrants[quadrant].losses;
  if (qGames === 0) return { opponent: upcoming.opponent, quadrant, outfit: topOutfit };
  return null;
}

export function computeMilestones(completedGames, netLookup) {
  if (!completedGames.length) return [];

  let maxStreak = 0;
  let curStreak = 0;
  const outfitStreaks = {};
  let firstQ1Road = null;
  let worstLoss = null;
  let worstRank = 0;
  let bestWin = null;
  let bestRank = 999;
  let otWins = 0;
  let otTotal = 0;

  for (const g of completedGames) {
    if (g.result === 'W') {
      curStreak++;
      if (curStreak > maxStreak) maxStreak = curStreak;
    } else {
      curStreak = 0;
    }

    if (g.outfit) {
      if (!outfitStreaks[g.outfit]) outfitStreaks[g.outfit] = { max: 0, cur: 0 };
      if (g.result === 'W') {
        outfitStreaks[g.outfit].cur++;
        outfitStreaks[g.outfit].max = Math.max(outfitStreaks[g.outfit].max, outfitStreaks[g.outfit].cur);
      } else {
        outfitStreaks[g.outfit].cur = 0;
      }
    }

    const rank = findNetRankForOpponent(netLookup, g.opponent);

    if (!firstQ1Road && g.result === 'W' && g.location === '@' && getQuadrant('@', rank) === 1) {
      firstQ1Road = g;
    }

    if (rank) {
      if (g.result === 'W' && rank < bestRank) {
        bestRank = rank;
        bestWin = g;
      }
      if (g.result === 'L' && rank > worstRank) {
        worstRank = rank;
        worstLoss = g;
      }
    }

    if (g.overtime) {
      otTotal++;
      if (g.result === 'W') otWins++;
    }
  }

  const ms = [];
  if (maxStreak >= 3) ms.push({ icon: '🔥', text: `Longest win streak: ${maxStreak} games` });

  let bestOutfitStreak = { outfit: null, count: 0 };
  for (const [outfit, data] of Object.entries(outfitStreaks)) {
    if (data.max > bestOutfitStreak.count) bestOutfitStreak = { outfit, count: data.max };
  }
  if (bestOutfitStreak.count >= 3) {
    ms.push({ icon: '👔', text: `Best outfit streak: ${bestOutfitStreak.count}W in ${bestOutfitStreak.outfit}` });
  }
  if (firstQ1Road) {
    ms.push({ icon: '🏆', text: `First Q1 road win: ${formatLocationLabel('@', 'full')} ${firstQ1Road.opponent}` });
  }
  if (worstLoss && worstRank > 150) {
    ms.push({ icon: '😬', text: `Worst loss: ${formatLocationLabel(worstLoss.location, 'full')} ${worstLoss.opponent} (NET #${worstRank})` });
  }
  if (bestWin && bestRank <= 25) {
    ms.push({ icon: '⭐', text: `Best win: ${formatLocationLabel(bestWin.location, 'full')} ${bestWin.opponent} (NET #${bestRank})` });
  }
  if (otTotal >= 2) {
    ms.push({ icon: '⏱️', text: `Overtime record: ${otWins}-${otTotal - otWins}` });
  }

  return ms;
}

export function computeCoffeeCrossover(coffeeVisits, completedGames) {
  if (!coffeeVisits.length || !completedGames.length) return [];

  const gameDateMap = {};
  for (const g of completedGames) {
    if (g.date) gameDateMap[g.date] = g;
  }

  const drinkStats = {};
  for (const visit of coffeeVisits) {
    const visitDate = toIsoDate(visit.date || visit.visitDate);
    const game = gameDateMap[visitDate];
    if (!game) continue;

    const drink = visit.coffee_order || visit.drink || visit.order || '';
    if (!drink) continue;
    if (!drinkStats[drink]) drinkStats[drink] = { wins: 0, losses: 0 };
    if (game.result === 'W') drinkStats[drink].wins++;
    if (game.result === 'L') drinkStats[drink].losses++;
  }

  return Object.entries(drinkStats)
    .filter(([, s]) => s.wins + s.losses >= 2)
    .map(([drink, s]) => ({
      drink,
      wins: s.wins,
      losses: s.losses,
      total: s.wins + s.losses,
      winRate: Math.round((s.wins / (s.wins + s.losses)) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total);
}

export function computeScoutingReport(sortedGames, completedGames, netLookup, netStatus) {
  const upcoming = sortedGames.filter((g) => !g.result || (g.result !== 'W' && g.result !== 'L'));
  if (!upcoming.length || netStatus !== 'loaded') return null;
  const game = upcoming[0];
  const rank = findNetRankForOpponent(netLookup, game.opponent);
  const quadrant = getQuadrant(game.location || 'vs', rank);

  const vsOpponent = completedGames.filter(
    (g) => g.opponent.toLowerCase() === game.opponent.toLowerCase()
  );
  const vsWins = vsOpponent.filter((g) => g.result === 'W').length;
  const vsLosses = vsOpponent.length - vsWins;

  return {
    opponent: game.opponent,
    location: game.location || 'vs',
    date: game.date,
    netRank: rank,
    quadrant,
    allTimeRecord: vsOpponent.length ? { wins: vsWins, losses: vsLosses } : null,
  };
}

export function computeVestAdvisor(scoutingReport, outfitStats, completedGames) {
  if (!scoutingReport?.quadrant) return [];
  const q = scoutingReport.quadrant;
  const loc = scoutingReport.location;

  return outfitStats
    .map((stat) => {
      const qW = stat.quadrants[q].wins;
      const qL = stat.quadrants[q].losses;
      const qGames = qW + qL;

      const locGames = completedGames.filter((g) => g.outfit === stat.outfit && g.location === loc);
      const locW = locGames.filter((g) => g.result === 'W').length;
      const locL = locGames.length - locW;

      let confidence = 'unknown';
      if (qGames === 0) confidence = 'untested';
      else if (qGames >= 2 && qW / qGames >= 0.7) confidence = 'high';
      else if (qGames >= 2 && qW / qGames >= 0.4) confidence = 'medium';
      else if (qGames >= 1) confidence = 'low';

      return {
        outfit: stat.outfit,
        confidence,
        qRecord: `${qW}-${qL}`,
        locRecord: locGames.length ? `${locW}-${locL}` : null,
        qGames,
        form: stat.form,
      };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2, untested: 3, unknown: 4 };
      return (order[a.confidence] ?? 4) - (order[b.confidence] ?? 4);
    });
}
