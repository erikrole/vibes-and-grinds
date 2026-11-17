// Season storylines, outfit badges, quadrant advice, and game-day drinks.
// Kept out of the dashboard so the results can be tested without rendering it.

import { titleCaseOrder } from './display';
import {
  countTrailingStreak,
  findNetRankForOpponent,
  formatLocationLabel,
  getQuadrant,
  indexByCentralDay,
  toIsoDate,
} from './vestTrackerMath';

export function outfitBadgeList(stat) {
  const list = [];
  const streak = countTrailingStreak(stat.results || []);
  if (streak && streak.count >= 3 && streak.result === 'W') list.push(`${streak.count}-Game Heater`);
  else if (streak && streak.count >= 3 && streak.result === 'L') list.push(`${streak.count}-Game Skid`);
  if (stat.roadWins >= 3) list.push(`Road Warrior (${stat.roadWins}-${stat.roadLosses})`);
  if (stat.quadrants?.[1]?.wins >= 2) {
    list.push(`Q1 Slayer (${stat.quadrants[1].wins}-${stat.quadrants[1].losses})`);
  }
  if (stat.games >= 3 && stat.losses === 0) list.push('Undefeated');
  if (stat.otWins >= 2) list.push(`OT Specialist (${stat.otWins}-${stat.otLosses})`);
  return list;
}

export function buildOutfitBadges(outfitStats = []) {
  const badges = {};
  for (const stat of outfitStats) {
    const list = outfitBadgeList(stat);
    if (list.length) badges[stat.outfit] = list;
  }
  return badges;
}

/**
 * Completed games against this opponent, case-insensitive.
 * A missing name is "no history", not a throw — one blank row used to crash
 * the scouting memo and the vest error boundary replaced the page.
 */
export function recordAgainstOpponent(completedGames = [], opponent) {
  const next = `${opponent || ''}`.trim().toLowerCase();
  if (!next) return null;
  const played = completedGames.filter((game) => `${game?.opponent || ''}`.trim().toLowerCase() === next);
  if (!played.length) return null;
  const wins = played.filter((game) => game.result === 'W').length;
  return { wins, losses: played.length - wins };
}

export function buildQuadrantAdvisor(outfitStats = [], completedGames = [], scoutingReport) {
  if (!scoutingReport?.quadrant) return [];
  const quadrant = scoutingReport.quadrant;
  const location = scoutingReport.location;
  const gamesByOutfitLocation = new Map();
  for (const game of completedGames) {
    const key = `${game.outfit}\0${game.location}`;
    const list = gamesByOutfitLocation.get(key);
    if (list) list.push(game);
    else gamesByOutfitLocation.set(key, [game]);
  }

  return outfitStats
    .map((stat) => {
      const qW = stat.quadrants[quadrant].wins;
      const qL = stat.quadrants[quadrant].losses;
      const qGames = qW + qL;
      const locGames = gamesByOutfitLocation.get(`${stat.outfit}\0${location}`) || [];
      const locW = locGames.filter((game) => game.result === 'W').length;
      let confidence = 'unknown';
      if (qGames === 0) confidence = 'untested';
      else if (qGames >= 2 && qW / qGames >= 0.7) confidence = 'high';
      else if (qGames >= 2 && qW / qGames >= 0.4) confidence = 'medium';
      else if (qGames >= 1) confidence = 'low';
      return {
        outfit: stat.outfit,
        confidence,
        qRecord: `${qW}–${qL}`,
        locRecord: locGames.length ? `${locW}–${locGames.length - locW}` : null,
        qGames,
        form: stat.form,
      };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2, untested: 3, unknown: 4 };
      return (order[a.confidence] ?? 4) - (order[b.confidence] ?? 4);
    });
}

export function buildSeasonMilestones(completedGames = [], netLookup) {
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

  for (const game of completedGames) {
    if (game.result === 'W') {
      curStreak += 1;
      if (curStreak > maxStreak) maxStreak = curStreak;
    } else {
      curStreak = 0;
    }

    if (game.outfit) {
      if (!outfitStreaks[game.outfit]) outfitStreaks[game.outfit] = { max: 0, cur: 0 };
      if (game.result === 'W') {
        outfitStreaks[game.outfit].cur += 1;
        outfitStreaks[game.outfit].max = Math.max(outfitStreaks[game.outfit].max, outfitStreaks[game.outfit].cur);
      } else {
        outfitStreaks[game.outfit].cur = 0;
      }
    }

    const rank = findNetRankForOpponent(netLookup, game.opponent);
    if (!firstQ1Road && game.result === 'W' && game.location === '@' && getQuadrant('@', rank) === 1) {
      firstQ1Road = game;
    }
    if (rank) {
      if (game.result === 'W' && rank < bestRank) {
        bestRank = rank;
        bestWin = game;
      }
      if (game.result === 'L' && rank > worstRank) {
        worstRank = rank;
        worstLoss = game;
      }
    }
    if (game.overtime) {
      otTotal += 1;
      if (game.result === 'W') otWins += 1;
    }
  }

  const milestones = [];
  if (maxStreak >= 3) milestones.push({ icon: '🔥', text: `Longest win streak: ${maxStreak} games` });

  let bestOutfitStreak = { outfit: null, count: 0 };
  for (const [outfit, data] of Object.entries(outfitStreaks)) {
    if (data.max > bestOutfitStreak.count) bestOutfitStreak = { outfit, count: data.max };
  }
  if (bestOutfitStreak.count >= 3) {
    milestones.push({ icon: '👔', text: `Best outfit streak: ${bestOutfitStreak.count}W in ${bestOutfitStreak.outfit}` });
  }
  if (firstQ1Road) {
    milestones.push({ icon: '🏆', text: `First Q1 road win: ${formatLocationLabel('@', 'full')} ${firstQ1Road.opponent}` });
  }
  if (worstLoss && worstRank > 150) {
    milestones.push({
      icon: '😬',
      text: `Worst loss: ${formatLocationLabel(worstLoss.location, 'full')} ${worstLoss.opponent} (NET #${worstRank})`,
    });
  }
  if (bestWin && bestRank <= 25) {
    milestones.push({
      icon: '⭐',
      text: `Best win: ${formatLocationLabel(bestWin.location, 'full')} ${bestWin.opponent} (NET #${bestRank})`,
    });
  }
  if (otTotal >= 2) milestones.push({ icon: '⏱️', text: `Overtime record: ${otWins}–${otTotal - otWins}` });

  return milestones;
}

/**
 * Drinks logged on a vest game day. Orders are folded the same way the journal
 * folds them, so "oat latte" and "Oat Latte" are one drink. A drink needs two
 * game days before it is a record rather than noise.
 */
export function gameDayDrinks(coffeeVisits = [], completedGames = []) {
  if (!coffeeVisits.length || !completedGames.length) return [];
  const gameDateMap = indexByCentralDay(completedGames);
  const drinkStats = {};
  for (const visit of coffeeVisits) {
    const game = gameDateMap.get(toIsoDate(visit.date || visit.visitDate));
    if (!game) continue;
    const drink = titleCaseOrder(visit.coffee_order || visit.drink || visit.order || '');
    if (!drink) continue;
    if (!drinkStats[drink]) drinkStats[drink] = { wins: 0, losses: 0 };
    if (game.result === 'W') drinkStats[drink].wins += 1;
    else drinkStats[drink].losses += 1;
  }
  return Object.entries(drinkStats)
    .filter(([, stats]) => stats.wins + stats.losses >= 2)
    .map(([drink, stats]) => ({
      drink,
      wins: stats.wins,
      losses: stats.losses,
      total: stats.wins + stats.losses,
      winRate: Math.round((stats.wins / (stats.wins + stats.losses)) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total);
}

/** Newest completed results first, by game date, not by array position. */
export function recentLoggedResults(games = [], limit = 10) {
  return [...games]
    .filter((game) => game?.result === 'W' || game?.result === 'L')
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (Number(b.id) || 0) - (Number(a.id) || 0))
    .slice(0, limit);
}
