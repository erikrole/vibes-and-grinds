import { describe, it, expect } from 'vitest';
import {
  computeCoffeeCrossover,
  computeJinxAlert,
  computeMilestones,
  computeOutfitBadges,
  computeOutfitStats,
  computeRecommendation,
  computeScoutingReport,
  computeVestAdvisor,
  getCompletedGames,
  getOutfits,
  getSummary,
  getVisibleGames,
  sortGames,
} from './vestComputations';
import { buildNetLookup, normalizeTeamName } from './vestStats';

function game(overrides = {}) {
  return {
    id: 1,
    date: '2025-11-01',
    location: 'vs',
    opponent: 'Indiana',
    outfit: 'Red Vest',
    result: 'W',
    overtime: false,
    ranking: null,
    ...overrides,
  };
}

const NET = buildNetLookup([
  { team: 'Auburn', rank: 1, key: normalizeTeamName('Auburn') },
  { team: 'Indiana', rank: 25, key: normalizeTeamName('Indiana') },
  { team: 'Penn State', rank: 200, key: normalizeTeamName('Penn State') },
  { team: 'Niagara', rank: 320, key: normalizeTeamName('Niagara') },
]);

describe('sortGames + getCompletedGames', () => {
  it('orders by date and filters to W/L only', () => {
    const games = [
      game({ id: 3, date: '2025-12-01', result: 'L' }),
      game({ id: 1, date: '2025-11-01', result: 'W' }),
      game({ id: 2, date: '2025-11-15', result: '' }), // upcoming
    ];
    const sorted = sortGames(games);
    expect(sorted.map((g) => g.id)).toEqual([1, 2, 3]);
    expect(getCompletedGames(sorted).map((g) => g.id)).toEqual([1, 3]);
  });
});

describe('getOutfits + getVisibleGames + getSummary', () => {
  const games = [
    game({ id: 1, date: '2025-11-01', outfit: 'Red Vest', result: 'W' }),
    game({ id: 2, date: '2025-11-05', outfit: 'Black Vest', result: 'L' }),
    game({ id: 3, date: '2025-11-10', outfit: 'Red Vest', result: 'W' }),
  ];
  const sorted = sortGames(games);
  const completed = getCompletedGames(sorted);

  it('always prepends "All outfits"', () => {
    expect(getOutfits(completed)[0]).toBe('All outfits');
    expect(getOutfits(completed)).toContain('Red Vest');
  });

  it('reverses the visible games for newest-first display', () => {
    const visible = getVisibleGames(sorted, 'All outfits');
    expect(visible.map((g) => g.id)).toEqual([3, 2, 1]);
  });

  it('filters visible games by selected outfit', () => {
    const visible = getVisibleGames(sorted, 'Red Vest');
    expect(visible.map((g) => g.id)).toEqual([3, 1]);
  });

  it('summary counts wins / losses for the selected outfit', () => {
    expect(getSummary(completed, 'All outfits')).toEqual({ wins: 2, losses: 1 });
    expect(getSummary(completed, 'Red Vest')).toEqual({ wins: 2, losses: 0 });
  });
});

describe('computeOutfitStats', () => {
  it('aggregates wins, losses, road record, OT record, and quadrants', () => {
    const completed = getCompletedGames(
      sortGames([
        game({ id: 1, opponent: 'Auburn', result: 'W', location: 'vs', outfit: 'Red' }),
        game({ id: 2, opponent: 'Niagara', result: 'L', location: '@', outfit: 'Red' }),
        game({ id: 3, opponent: 'Indiana', result: 'W', location: '@', outfit: 'Red', overtime: true }),
      ])
    );
    const stats = computeOutfitStats(completed, NET);
    const red = stats.find((s) => s.outfit === 'Red');

    expect(red.wins).toBe(2);
    expect(red.losses).toBe(1);
    expect(red.roadWins).toBe(1);
    expect(red.roadLosses).toBe(1);
    expect(red.otWins).toBe(1);
    expect(red.otLosses).toBe(0);
    // Auburn (rank 1) home → Q1 win; Indiana (rank 25) away → Q1 win; Niagara
    // (rank 320) away → Q4 loss.
    expect(red.quadrants[1].wins).toBe(2);
    expect(red.quadrants[4].losses).toBe(1);
  });

  it('marks form as hot after 2+ trailing wins', () => {
    const completed = [
      game({ id: 1, result: 'W', outfit: 'X' }),
      game({ id: 2, result: 'W', outfit: 'X' }),
      game({ id: 3, result: 'W', outfit: 'X' }),
    ];
    expect(computeOutfitStats(completed, NET)[0].form).toBe('hot');
  });

  it('marks form as cold after 2+ trailing losses', () => {
    const completed = [
      game({ id: 1, result: 'L', outfit: 'X' }),
      game({ id: 2, result: 'L', outfit: 'X' }),
    ];
    expect(computeOutfitStats(completed, NET)[0].form).toBe('cold');
  });
});

describe('computeRecommendation', () => {
  it('returns null with fewer than 2 outfits', () => {
    const completed = [game({ outfit: 'Only', result: 'W' })];
    const stats = computeOutfitStats(completed, NET);
    expect(computeRecommendation(completed, stats)).toBe(null);
  });

  it('excludes the most recently worn outfit', () => {
    const completed = [
      game({ id: 1, outfit: 'A', result: 'W' }),
      game({ id: 2, outfit: 'A', result: 'W' }),
      game({ id: 3, outfit: 'B', result: 'W' }),
      game({ id: 4, outfit: 'C', result: 'W' }),
      game({ id: 5, outfit: 'C', result: 'W' }), // last
    ];
    const stats = computeOutfitStats(completed, NET);
    const rec = computeRecommendation(completed, stats);
    expect(rec.blockedOutfit).toBe('C');
    expect(rec.top.outfit).not.toBe('C');
    expect(rec.alternatives.every((a) => a.outfit !== 'C')).toBe(true);
  });
});

describe('computeOutfitBadges', () => {
  it('flags road-warrior, Q1 slayer, and undefeated', () => {
    const completed = [
      game({ id: 1, location: '@', result: 'W', outfit: 'Red', opponent: 'Auburn' }),
      game({ id: 2, location: '@', result: 'W', outfit: 'Red', opponent: 'Auburn' }),
      game({ id: 3, location: '@', result: 'W', outfit: 'Red', opponent: 'Auburn' }),
      game({ id: 4, location: 'vs', result: 'W', outfit: 'Red', opponent: 'Indiana' }),
    ];
    const stats = computeOutfitStats(completed, NET);
    const badges = computeOutfitBadges(stats);
    expect(badges.Red).toContain('Road Warrior (3-0 away)');
    // 3 Auburn road wins + 1 Indiana home win — all Q1 since both teams rank
    // inside their location's Q1 threshold.
    expect(badges.Red).toContain('Q1 Slayer (4-0)');
    expect(badges.Red).toContain('Undefeated');
  });
});

describe('computeJinxAlert', () => {
  it('flags untested quadrants for the recommended outfit', () => {
    const sorted = sortGames([
      game({ id: 1, outfit: 'A', result: 'W', opponent: 'Niagara', location: 'vs' }), // Q4
      game({ id: 2, outfit: 'A', result: 'W', opponent: 'Niagara', location: 'vs' }),
      game({ id: 3, outfit: 'B', result: 'W', opponent: 'Niagara', location: 'vs' }), // last
      game({ id: 4, outfit: '', result: '', opponent: 'Auburn', location: 'vs' }), // upcoming Q1
    ]);
    const completed = getCompletedGames(sorted);
    const stats = computeOutfitStats(completed, NET);
    const rec = computeRecommendation(completed, stats);
    expect(rec).not.toBe(null);
    const alert = computeJinxAlert(rec, sorted, NET, stats);
    expect(alert).toEqual({ opponent: 'Auburn', quadrant: 1, outfit: 'A' });
  });
});

describe('computeMilestones', () => {
  it('returns nothing for an empty season', () => {
    expect(computeMilestones([], NET)).toEqual([]);
  });

  it('reports a long win streak', () => {
    const completed = [1, 2, 3, 4].map((i) => game({ id: i, result: 'W', outfit: 'Red' }));
    const ms = computeMilestones(completed, NET);
    expect(ms.find((m) => m.text.includes('Longest win streak: 4 games'))).toBeDefined();
  });

  it('reports best win when NET is known', () => {
    const completed = [
      game({ id: 1, opponent: 'Auburn', result: 'W' }), // NET 1
      game({ id: 2, opponent: 'Indiana', result: 'L' }), // NET 25
    ];
    const ms = computeMilestones(completed, NET);
    expect(ms.find((m) => m.text.includes('Best win'))).toBeDefined();
  });
});

describe('computeCoffeeCrossover', () => {
  it('joins coffee visits to game-day results by date', () => {
    const completed = [
      game({ id: 1, date: '2026-01-01', result: 'W' }),
      game({ id: 2, date: '2026-01-08', result: 'L' }),
      game({ id: 3, date: '2026-01-15', result: 'W' }),
    ];
    const visits = [
      { date: '2026-01-01', coffee_order: 'Latte' },
      { date: '2026-01-08', coffee_order: 'Latte' },
      { date: '2026-01-15', coffee_order: 'Latte' },
    ];
    const cross = computeCoffeeCrossover(visits, completed);
    expect(cross[0].drink).toBe('Latte');
    expect(cross[0].wins).toBe(2);
    expect(cross[0].losses).toBe(1);
  });

  it('skips drinks with fewer than 2 game-day appearances', () => {
    const completed = [game({ date: '2026-01-01', result: 'W' })];
    const visits = [{ date: '2026-01-01', coffee_order: 'Latte' }];
    expect(computeCoffeeCrossover(visits, completed)).toEqual([]);
  });
});

describe('computeScoutingReport', () => {
  it('returns null until NET is loaded', () => {
    const sorted = sortGames([game({ id: 1, result: '' })]);
    expect(computeScoutingReport(sorted, [], NET, 'loading')).toBe(null);
  });

  it('reports next opponent rank, quadrant, and prior record', () => {
    const sorted = sortGames([
      game({ id: 1, opponent: 'Auburn', result: 'W' }),
      game({ id: 2, opponent: 'Auburn', result: 'L' }),
      game({ id: 3, opponent: 'Auburn', result: '' }), // upcoming
    ]);
    const completed = getCompletedGames(sorted);
    const report = computeScoutingReport(sorted, completed, NET, 'loaded');
    expect(report.opponent).toBe('Auburn');
    expect(report.netRank).toBe(1);
    expect(report.quadrant).toBe(1);
    expect(report.allTimeRecord).toEqual({ wins: 1, losses: 1 });
  });
});

describe('computeVestAdvisor', () => {
  it('orders by confidence: high → medium → low → untested', () => {
    const completed = [
      game({ id: 1, opponent: 'Auburn', outfit: 'A', result: 'W', location: 'vs' }),
      game({ id: 2, opponent: 'Auburn', outfit: 'A', result: 'W', location: 'vs' }),
      game({ id: 3, opponent: 'Auburn', outfit: 'A', result: 'W', location: 'vs' }),
      game({ id: 4, opponent: 'Auburn', outfit: 'B', result: 'L', location: 'vs' }),
      game({ id: 5, opponent: 'Auburn', outfit: 'C', result: 'W', location: 'vs' }),
    ];
    const stats = computeOutfitStats(completed, NET);
    const report = {
      quadrant: 1,
      location: 'vs',
      opponent: 'Auburn',
      date: null,
      netRank: 1,
      allTimeRecord: null,
    };
    const advisor = computeVestAdvisor(report, stats, completed);
    const confidences = advisor.map((a) => a.confidence);
    // high should come before low
    const order = { high: 0, medium: 1, low: 2, untested: 3, unknown: 4 };
    for (let i = 1; i < confidences.length; i++) {
      expect(order[confidences[i]]).toBeGreaterThanOrEqual(order[confidences[i - 1]]);
    }
  });
});
