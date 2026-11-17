import { describe, expect, it } from 'vitest';
import { boxScoreBars, computeFunStats, sideLeads } from './gameStats';

function game(overrides = {}) {
  return {
    date: '2026-01-10',
    opponent: 'Iowa',
    location: 'vs',
    wisconsin_score: 80,
    opponent_score: 70,
    wisconsin_h1: 40,
    opponent_h1: 30,
    broadcast: 'BTN',
    outfit: 'Red Vest',
    wi_leader_pts_name: 'Tonje',
    ...overrides,
  };
}

describe('box score bars', () => {
  it('keeps each total on the team that earned it, and treats fewer turnovers as the better side', () => {
    const bars = boxScoreBars({
      wi_fg_pct: 48,
      opp_fg_pct: 40,
      wi_3pt_pct: 35,
      opp_3pt_pct: 30,
      wi_ft_pct: 70,
      opp_ft_pct: 80,
      wi_rebounds: 43,
      opp_rebounds: 30,
      wi_turnovers: 8,
      opp_turnovers: 14,
    });
    const turnovers = bars.find((bar) => bar.label === 'TO');
    expect(turnovers).toMatchObject({ wi: 8, opp: 14, lowerIsBetter: true });
    expect(sideLeads(turnovers.wi, turnovers.opp, { lowerIsBetter: true })).toBe('wi');
    expect(sideLeads(48, 40)).toBe('wi');
    expect(sideLeads(70, 80)).toBe('opp');
    expect(sideLeads(10, 10)).toBe('tie');
  });
});

describe('computeFunStats', () => {
  it('returns null until a game has both scores', () => {
    expect(computeFunStats([])).toBeNull();
    expect(computeFunStats([game({ wisconsin_score: null })])).toBeNull();
    expect(computeFunStats([game({ opponent_score: 'nope' })])).toBeNull();
  });

  it('finds the blowout, the loss, the comeback, and the nail-biter', () => {
    const stats = computeFunStats([
      game({
        date: '2026-01-03',
        opponent: 'Purdue',
        location: '@',
        wisconsin_score: '55',
        opponent_score: '80',
        wisconsin_h1: 40,
        opponent_h1: 30,
        broadcast: 'FOX',
      }),
      game({
        date: '2026-01-10T00:00:00Z',
        opponent: 'Iowa',
        wisconsin_score: 90,
        opponent_score: 60,
        wisconsin_h1: 30,
        opponent_h1: 40,
        broadcast: 'CBS',
      }),
      game({
        date: '2026-01-17',
        opponent: 'Minnesota',
        location: 'N',
        wisconsin_score: 71,
        opponent_score: 70,
        wisconsin_h1: 35,
        opponent_h1: 35,
        broadcast: 'FS1',
      }),
    ], [
      { date: '2026-01-10', outfit: 'Blue Suit' },
    ]);

    expect(stats.gamesWithScores).toBe(3);
    expect(stats.avgScored).toBe(72);
    expect(stats.avgAllowed).toBe(70);
    expect(stats.biggestWin.opponent).toBe('Iowa');
    expect(stats.biggestWinMargin).toBe(30);
    expect(stats.biggestLoss.opponent).toBe('Purdue');
    expect(stats.biggestLossMargin).toBe(25);
    expect(stats.closestGame.opponent).toBe('Minnesota');
    expect(stats.closestMargin).toBe(1);
    expect(stats.comebackWins).toBe(1);
    expect(stats.blownLeads).toBe(1);
    expect(stats.tiedAtHalf).toBe(1);
    expect(stats.nailBiters).toBe(1);
    expect(stats.blowouts).toBe(1);
    expect(stats.tvStats).toEqual([]);
    expect(stats.outfitScoringList.map((item) => item.outfit)).toEqual(['Red Vest']);
  });

  it('keeps a tie out of the loss column and joins an outfit by calendar day', () => {
    const stats = computeFunStats([
      game({ wisconsin_score: 70, opponent_score: 70, broadcast: 'BTN', wi_leader_pts_name: 'Tonje' }),
      game({
        date: '2026-01-11',
        wisconsin_score: 78,
        opponent_score: 60,
        broadcast: 'ESPN',
        wi_leader_pts_name: 'Tonje',
      }),
      game({
        date: '2026-01-12',
        wisconsin_score: 81,
        opponent_score: 60,
        broadcast: 'BTN',
        wi_leader_pts_name: 'Tonje',
        outfit: '',
      }),
      game({
        date: '2026-01-20',
        wisconsin_score: 75,
        opponent_score: 60,
        broadcast: 'FOX',
        wi_leader_pts_name: 'Tonje',
        outfit: '',
      }),
    ], [
      { date: '2026-01-12T18:00:00', outfit: 'Gray Suit' },
      { date: '2026-01-20', outfit: 'Gray Suit' },
    ]);

    expect(stats.biggestLoss).toBeNull();
    expect(stats.closestMargin).toBe(0);
    expect(stats.tvStats).toEqual([{ network: 'BTN', wins: 1, losses: 1, total: 2, winRate: 50 }]);
    expect(stats.outfitScoringList.map((item) => item.outfit).sort()).toEqual(['Gray Suit', 'Red Vest']);
    expect(stats.topScorer).toEqual({ name: 'Tonje', count: 4 });
    expect(stats.outfitPlayerCombos).toEqual([
      { outfit: 'Red Vest', player: 'Tonje', count: 2 },
      { outfit: 'Gray Suit', player: 'Tonje', count: 2 },
    ]);
  });

  it('joins an evening tip to the Central game day instead of the UTC date', () => {
    const stats = computeFunStats([
      game({
        date: '2025-12-31T00:00:00Z',
        opponent: 'Milwaukee',
        outfit: '',
        wi_leader_pts_name: 'Tonje',
        wisconsin_score: 80,
        opponent_score: 50,
      }),
      game({
        date: '2025-12-31',
        opponent: 'Next',
        outfit: '',
        wi_leader_pts_name: 'Crowl',
        wisconsin_score: 70,
        opponent_score: 60,
      }),
      game({
        date: '2026-01-01T03:00:00Z',
        opponent: 'Also Next',
        outfit: '',
        wi_leader_pts_name: 'Crowl',
        wisconsin_score: 71,
        opponent_score: 60,
      }),
    ], [
      { date: '2025-12-30', outfit: 'Light Gray Vest' },
      { date: '2025-12-31', outfit: 'Red Vest' },
    ]);

    expect(stats.outfitScoringList.map((item) => item.outfit)).toEqual(['Red Vest']);
    expect(stats.outfitPlayerCombos).toEqual([
      { outfit: 'Red Vest', player: 'Crowl', count: 2 },
    ]);
  });
});
