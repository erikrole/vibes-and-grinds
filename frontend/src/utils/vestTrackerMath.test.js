import { describe, expect, it } from 'vitest';
import {
  buildNetLookup,
  buildOutfitStats,
  buildWhySentence,
  computeRecommendation,
  countTrailingStreak,
  decayedWinRate,
  expectedWinProb,
  findNetRankForOpponent,
  formatDate,
  formatLocationLabel,
  getQuadrant,
  indexByCentralDay,
  locationSplits,
  normalizeNetResponse,
  sampleTier,
  toIsoDate,
  wilsonLowerBound,
} from './vestTrackerMath';

function rankings(rows) {
  return buildNetLookup(rows.map(([team, rank]) => ({ team, rank })));
}

describe('streaks and record splits', () => {
  it('counts the trailing result', () => {
    expect(countTrailingStreak([])).toBeNull();
    expect(countTrailingStreak(['W'])).toEqual({ result: 'W', count: 1 });
    expect(countTrailingStreak(['W', 'W', 'L', 'L', 'L'])).toEqual({ result: 'L', count: 3 });
  });

  it('weights a recent win more than an old one', () => {
    expect(decayedWinRate([])).toBeNull();
    expect(decayedWinRate(['L', 'L', 'W'])).toBeGreaterThan(decayedWinRate(['W', 'L', 'L']));
    expect(decayedWinRate(['L', 'L'])).toBe(0);
  });

  it('splits completed games by location and skips blanks', () => {
    const games = [
      { result: 'W', location: 'vs' },
      { result: 'L', location: 'vs' },
      { result: 'W', location: '@' },
      { result: 'L', location: 'N' },
      { result: 'L', location: 'N' },
      { result: '', location: 'vs' },
      { result: 'W', location: '' },
    ];

    expect(locationSplits(games)).toEqual([
      { label: 'Home', location: 'vs', wins: 1, losses: 1 },
      { label: 'Road', location: '@', wins: 1, losses: 0 },
      { label: 'Neutral', location: 'N', wins: 0, losses: 2 },
    ]);
  });
});

describe('opponent strength', () => {
  const lookup = rankings([
    ['Iowa State', 12],
    ['Iowa', 40],
    ['Michigan State', 15],
    ['Central Michigan', 220],
    ['Northern Illinois', 180],
    ['BYU', 8],
    ['Wisconsin Milwaukee', 250],
    ['Texas A&M', 9],
    ['Texas', 18],
    ['SIU Edwardsville', 300],
  ]);

  it('uses the exact school and does not borrow a longer name', () => {
    expect(findNetRankForOpponent(lookup, 'Iowa')).toBe(40);
    expect(findNetRankForOpponent(lookup, 'Iowa Hawkeyes')).toBe(40);
    expect(findNetRankForOpponent(lookup, 'Michigan')).toBeNull();
    expect(findNetRankForOpponent(lookup, 'Texas')).toBe(18);
    expect(findNetRankForOpponent(lookup, 'BYU')).toBe(8);
    expect(findNetRankForOpponent(lookup, 'Northern Illinois')).toBe(180);
    expect(findNetRankForOpponent(lookup, 'SIU Edwardsville')).toBe(300);
    expect(findNetRankForOpponent(lookup, 'Milwaukee')).toBe(250);
    expect(findNetRankForOpponent(lookup, 'Iowa')).toBe(40);
  });

  it('returns null when the only candidates are different schools', () => {
    const stateOnly = rankings([['Iowa State', 12], ['Northern Iowa', 90]]);
    expect(findNetRankForOpponent(stateOnly, 'Iowa')).toBeNull();
    expect(findNetRankForOpponent(stateOnly, 'Iowa Hawkeyes')).toBeNull();
  });

  it('places ranks on the quadrant scale for that location', () => {
    expect(getQuadrant('vs', 30)).toBe(1);
    expect(getQuadrant('vs', 31)).toBe(2);
    expect(getQuadrant('vs', 75)).toBe(2);
    expect(getQuadrant('vs', 76)).toBe(3);
    expect(getQuadrant('@', 75)).toBe(1);
    expect(getQuadrant('@', 76)).toBe(2);
    expect(getQuadrant('N', 365)).toBe(4);
    expect(getQuadrant('vs', 366)).toBeNull();
    expect(getQuadrant('vs', 0)).toBeNull();
    expect(expectedWinProb('vs', 1)).toBe(0.5);
    expect(expectedWinProb('vs', null)).toBe(0.68);
    expect(expectedWinProb('@', 1)).toBe(0.22);
  });
});

describe('outfit stats', () => {
  const lookup = rankings([
    ['Iowa', 40],
    ['Michigan State', 15],
    ['Purdue', 5],
  ]);

  const completedGames = [
    { outfit: '', result: 'W', opponent: 'Campbell', location: 'vs' },
    { outfit: 'Red Vest', result: 'W', opponent: 'Iowa', location: 'vs' },
    { outfit: 'Red Vest', result: 'L', opponent: 'Michigan State', location: '@' },
    { outfit: 'Red Vest', result: 'W', opponent: 'Purdue', location: 'N', overtime: true },
    { outfit: 'Blue Suit', result: 'W', opponent: 'Iowa', location: 'vs' },
  ];

  it('keeps quadrant, road, and overtime splits without shifting indexes', () => {
    const stats = buildOutfitStats({
      completedGames,
      netLookup: lookup,
      teamWins: 4,
      teamGames: completedGames.length,
    });
    const red = stats.find((stat) => stat.outfit === 'Red Vest');

    expect(red.outfit).toBe('Red Vest');
    expect(red.wins).toBe(2);
    expect(red.losses).toBe(1);
    expect(red.roadWins).toBe(0);
    expect(red.roadLosses).toBe(1);
    expect(red.otWins).toBe(1);
    expect(red.quadrants[1]).toEqual({ wins: 1, losses: 1 });
    expect(red.quadrants[2]).toEqual({ wins: 1, losses: 0 });
    expect(red.lastIndex).toBe(3);
    expect(red.tier).toBe('small');
    expect(red.form).toBeNull();
    expect(red.smoothedRate).toBeCloseTo(6 / 7, 5);
  });

  it('does not let a one-game perfect outfit outrank a proven one', () => {
    const games = [
      ...Array.from({ length: 8 }, (_, index) => ({
        outfit: 'Proven',
        result: 'W',
        opponent: 'Iowa',
        location: 'vs',
        date: `2026-01-${String(index + 1).padStart(2, '0')}`,
      })),
      {
        outfit: 'Proven',
        result: 'L',
        opponent: 'Purdue',
        location: '@',
        date: '2026-01-09',
      },
      {
        outfit: 'Lucky',
        result: 'W',
        opponent: 'Campbell',
        location: 'vs',
        date: '2026-01-10',
      },
    ];
    const stats = buildOutfitStats({
      completedGames: games,
      netLookup: lookup,
      teamWins: 9,
      teamGames: games.length,
    });
    const recommendation = computeRecommendation(stats, games);
    expect(recommendation.top.outfit).toBe('Proven');
    expect(recommendation.blockedOutfit).toBe('Lucky');
  });

  it('explains the pick from the score, the sample, and the quadrant', () => {
    const games = [
      { outfit: 'Red Vest', result: 'W', opponent: 'Iowa', location: 'vs' },
      { outfit: 'Red Vest', result: 'W', opponent: 'Iowa', location: 'vs' },
      { outfit: 'Red Vest', result: 'W', opponent: 'Iowa', location: 'vs' },
      { outfit: 'Blue Suit', result: 'L', opponent: 'Purdue', location: '@' },
    ];
    const stats = buildOutfitStats({
      completedGames: games,
      netLookup: lookup,
      teamWins: 3,
      teamGames: games.length,
    });
    const recommendation = computeRecommendation(stats, games);
    const sentence = buildWhySentence(recommendation, { quadrant: 2 });
    expect(sentence).toContain('Red Vest' === recommendation.top.outfit ? 'Q2 record in this fit: 3-0.' : 'Q2');
    expect(sentence.length).toBeGreaterThan(10);
  });
});

describe('dates, samples, and feed shapes', () => {
  it('formats calendar dates without shifting an ISO day', () => {
    expect(formatDate('2026-03-05')).toBe('Mar. 5, 2026');
    expect(formatDate('2026-13-01')).toBe('2026-13-01');
    expect(formatDate('')).toBeNull();
    expect(formatLocationLabel('N', 'Adjective')).toBe('Neutral');
    expect(formatLocationLabel('nope', 'short')).toBe('vs');
    expect(toIsoDate('2026-03-05T23:00:00Z')).toBe('2026-03-05');
    expect(toIsoDate('2026-03-06T04:00:00Z')).toBe('2026-03-05');
    expect(formatDate('2025-12-31T00:00Z')).toBe('Dec. 30, 2025');
    expect(toIsoDate(new Date(2026, 2, 5, 20, 0))).toBe('2026-03-05');
    expect(toIsoDate('not a date')).toBe('');
    expect(sampleTier(0)).toBe('untested');
    expect(sampleTier(1)).toBe('tiny');
    expect(sampleTier(3)).toBe('small');
    expect(sampleTier(6)).toBe('decent');
    expect(sampleTier(7)).toBe('solid');
  });

  it('matches a coffee stop to the Central game day, not the UTC date', () => {
    const games = indexByCentralDay([
      { date: '2025-12-30', opponent: 'Milwaukee', result: 'W' },
      { date: '2025-12-31', opponent: 'Next', result: 'W' },
    ]);

    expect(games.get(toIsoDate('2025-12-31T00:00Z'))?.opponent).toBe('Milwaukee');
    expect(games.get(toIsoDate('2025-12-31'))?.opponent).toBe('Next');
    expect(games.get(toIsoDate('2026-01-01T03:00:00Z'))?.opponent).toBe('Next');
  });

  it('shrinks a win rate and accepts the worker payload shapes', () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
    expect(wilsonLowerBound(8, 10, 1)).toBeCloseTo(0.649, 3);
    expect(normalizeNetResponse(null)).toEqual([]);
    expect(normalizeNetResponse([{ team: 'Iowa', netRank: 40 }])).toEqual([{ team: 'Iowa', netRank: 40 }]);
    expect(normalizeNetResponse({ netRankings: { Iowa: '40', '': 3 } })).toEqual([{ team: 'Iowa', netRank: 40 }]);
    expect(normalizeNetResponse({
      standings: [{ school: 'Purdue', NET: '5' }, { school: '', rank: 1 }],
    })).toEqual([{ team: 'Purdue', netRank: 5 }]);
  });
});
