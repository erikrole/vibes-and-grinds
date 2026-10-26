import { describe, expect, it } from 'vitest';
import { buildNetLookup } from './vestTrackerMath';
import {
  buildOutfitBadges,
  buildQuadrantAdvisor,
  buildSeasonMilestones,
  gameDayDrinks,
  outfitBadgeList,
  recentLoggedResults,
  recordAgainstOpponent,
} from './vestStory';

const lookup = buildNetLookup([
  { team: 'Purdue', rank: 5 },
  { team: 'Michigan', rank: 20 },
  { team: 'Campbell', rank: 280 },
]);

function stat(overrides = {}) {
  return {
    outfit: 'Red Vest',
    games: 1,
    wins: 1,
    losses: 0,
    roadWins: 0,
    roadLosses: 0,
    otWins: 0,
    otLosses: 0,
    results: ['W'],
    form: null,
    quadrants: {
      1: { wins: 0, losses: 0 },
      2: { wins: 0, losses: 0 },
      3: { wins: 0, losses: 0 },
      4: { wins: 0, losses: 0 },
    },
    ...overrides,
  };
}

describe('outfit badges', () => {
  it('names a heater, a road run, a quadrant run, an undefeated sample, and overtime', () => {
    expect(outfitBadgeList(stat({
      games: 4,
      wins: 4,
      losses: 0,
      results: ['W', 'W', 'W', 'W'],
      roadWins: 3,
      roadLosses: 0,
      otWins: 2,
      otLosses: 0,
      quadrants: { 1: { wins: 2, losses: 1 } },
    }))).toEqual([
      '4-Game Heater',
      'Road Warrior (3-0)',
      'Q1 Slayer (2-1)',
      'Undefeated',
      'OT Specialist (2-0)',
    ]);
  });

  it('skips a short sample and a two-game skid', () => {
    expect(outfitBadgeList(stat())).toEqual([]);
    expect(outfitBadgeList(stat({ results: ['L', 'L'], losses: 2, wins: 0 }))).toEqual([]);
    expect(buildOutfitBadges([
      stat(),
      stat({ outfit: 'Blue Suit', results: ['L', 'L', 'L'], losses: 3, wins: 0, games: 3 }),
    ])).toEqual({ 'Blue Suit': ['3-Game Skid'] });
  });
});

describe('opponent history', () => {
  const games = [
    { opponent: 'Iowa', result: 'W' },
    { opponent: ' iowa ', result: 'L' },
    { opponent: null, result: 'W' },
    { opponent: 'Purdue', result: 'L' },
  ];

  it('folds case and does not throw when a row has no opponent', () => {
    expect(recordAgainstOpponent(games, 'IOWA')).toEqual({ wins: 1, losses: 1 });
    expect(recordAgainstOpponent(games, '')).toBeNull();
    expect(recordAgainstOpponent(games, 'Duke')).toBeNull();
  });
});

describe('quadrant advisor', () => {
  const outfits = [
    stat({
      outfit: 'Proven',
      quadrants: { 1: { wins: 2, losses: 0 }, 2: { wins: 0, losses: 0 }, 3: { wins: 0, losses: 0 }, 4: { wins: 0, losses: 0 } },
    }),
    stat({
      outfit: 'Mixed',
      quadrants: { 1: { wins: 1, losses: 1 }, 2: { wins: 0, losses: 0 }, 3: { wins: 0, losses: 0 }, 4: { wins: 0, losses: 0 } },
    }),
    stat({
      outfit: 'Cold',
      quadrants: { 1: { wins: 0, losses: 2 }, 2: { wins: 0, losses: 0 }, 3: { wins: 0, losses: 0 }, 4: { wins: 0, losses: 0 } },
    }),
    stat({ outfit: 'New' }),
  ];
  const games = [
    { outfit: 'Proven', location: '@', result: 'W' },
    { outfit: 'Proven', location: '@', result: 'L' },
  ];

  it('ranks confidence and keeps the location split beside the quadrant split', () => {
    expect(buildQuadrantAdvisor(outfits, games, null)).toEqual([]);
    const advice = buildQuadrantAdvisor(outfits, games, { quadrant: 1, location: '@' });
    expect(advice.map((row) => [row.outfit, row.confidence, row.qRecord, row.locRecord])).toEqual([
      ['Proven', 'high', '2–0', '1–1'],
      ['Mixed', 'medium', '1–1', null],
      ['Cold', 'low', '0–2', null],
      ['New', 'untested', '0–0', null],
    ]);
  });
});

describe('season milestones', () => {
  const games = [
    { result: 'W', outfit: 'Red Vest', opponent: 'Campbell', location: 'vs', overtime: false },
    { result: 'W', outfit: 'Red Vest', opponent: 'Campbell', location: 'vs', overtime: true },
    { result: 'W', outfit: 'Red Vest', opponent: 'Michigan', location: '@', overtime: false },
    { result: 'L', outfit: 'Blue Suit', opponent: 'Campbell', location: 'vs', overtime: true },
    { result: 'W', outfit: 'Red Vest', opponent: null, location: 'vs', overtime: false },
    { result: 'L', outfit: 'Blue Suit', opponent: 'Purdue', location: '@', overtime: false },
  ];

  it('tells the streak, the road win, the bad loss, the good win, and overtime', () => {
    const milestones = buildSeasonMilestones(games, lookup);
    expect(milestones.map((item) => item.text)).toEqual([
      'Longest win streak: 3 games',
      'Best outfit streak: 4W in Red Vest',
      'First Q1 road win: at Michigan',
      'Worst loss: vs Campbell (NET #280)',
      'Best win: at Michigan (NET #20)',
      'Overtime record: 1–1',
    ]);
  });

  it('stays quiet for a short season and a missing opponent', () => {
    expect(buildSeasonMilestones([], lookup)).toEqual([]);
    expect(() => buildSeasonMilestones([
      { result: 'L', opponent: null, location: 'vs' },
    ], lookup)).not.toThrow();
  });
});

describe('game-day drinks', () => {
  const games = [
    { date: '2026-01-10', result: 'W', opponent: 'Michigan' },
    { date: '2026-01-13', result: 'L', opponent: 'Minnesota' },
    { date: '2026-01-17', result: 'W', opponent: 'Rutgers' },
  ];

  it('folds drink spelling and hides a one-off order', () => {
    const drinks = gameDayDrinks([
      { date: '2026-01-10', coffee_order: 'oat   latte' },
      { date: '2026-01-13', coffee_order: 'Oat Latte' },
      { date: '2026-01-17', coffee_order: 'cortado' },
      { date: '2026-02-01', coffee_order: 'oat latte' },
      { date: '2026-01-10T18:00:00', coffee_order: '' },
    ], games);

    expect(drinks).toEqual([
      { drink: 'Oat Latte', wins: 1, losses: 1, total: 2, winRate: 50 },
    ]);
  });

  it('matches a late UTC timestamp to the Central game day', () => {
    const drinks = gameDayDrinks([
      { date: '2026-01-11T03:30:00Z', coffee_order: 'cortado' },
      { date: '2026-01-13', coffee_order: 'cortado' },
    ], games);
    expect(drinks).toEqual([
      { drink: 'Cortado', wins: 1, losses: 1, total: 2, winRate: 50 },
    ]);
  });
});

describe('recent logged results', () => {
  it('orders by date, newest first, and ignores games without a result', () => {
    const games = [
      { id: 1, date: '2026-01-03', result: 'L', opponent: 'Purdue' },
      { id: 4, date: '2026-02-01', result: '', opponent: 'Future' },
      { id: 2, date: '2026-01-20', result: 'W', opponent: 'Iowa' },
      { id: 3, date: '2026-01-10', result: 'W', opponent: 'Michigan' },
    ];
    expect(recentLoggedResults(games, 2).map((game) => game.id)).toEqual([2, 3]);
  });
});
