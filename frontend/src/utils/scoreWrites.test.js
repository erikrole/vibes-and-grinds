import { describe, expect, it } from 'vitest';
import { parseBoxScore } from '../../../functions/api/vest/_espn.js';
import {
  boxScoreNeedsWrite,
  keepStoredBoxScore,
  newestFetchedAtMs,
  planScoreSync,
  shouldServeCachedScores,
  sqliteUtcMs,
} from '../../../functions/api/vest/_scoreWrites.js';

const milwaukee = {
  espnEventId: '401',
  date: '2025-12-31T00:00Z',
  completed: true,
  wisconsinScore: 80,
  opponentScore: 62,
  wisconsinH1: 40,
  wisconsinH2: 40,
  opponentH1: 30,
  opponentH2: 32,
  otPeriods: 0,
  venue: 'Kohl Center',
  venueCity: 'Madison',
  broadcast: 'BTN',
  attendance: 17287,
  oppRanking: null,
  wiRanking: null,
  wiRecord: '10-3',
};

const vestRows = [
  { game_id: 13, date: '2025-12-30', espn_event_id: '401' },
  { game_id: 14, date: '2025-12-31', espn_event_id: null },
];

function storedRow(overrides = {}) {
  return {
    espn_event_id: '401',
    game_id: 13,
    wisconsin_score: 80,
    opponent_score: 62,
    wisconsin_h1: 40,
    wisconsin_h2: 40,
    opponent_h1: 30,
    opponent_h2: 32,
    ot_periods: 0,
    venue: 'Kohl Center',
    venue_city: 'Madison',
    broadcast: 'BTN',
    attendance: 17287,
    opp_ranking: null,
    wi_ranking: null,
    wi_record: '10-3',
    fetched_at: '2026-03-06 17:59:00',
    ...overrides,
  };
}

describe('shouldServeCachedScores', () => {
  const now = sqliteUtcMs('2026-03-06 18:00:00');

  it('reads the sqlite timestamp as UTC and serves a fresh cache without writing', () => {
    expect(sqliteUtcMs('2026-03-06 18:00:00')).toBe(Date.parse('2026-03-06T18:00:00Z'));
    expect(shouldServeCachedScores({
      rowCount: 2,
      newestFetchedAtMs: newestFetchedAtMs([storedRow()]),
      now,
      ttlMs: 120_000,
    })).toBe(true);
  });

  it('refetches when the cache is empty or older than the ttl', () => {
    expect(shouldServeCachedScores({
      rowCount: 0,
      newestFetchedAtMs: now,
      now,
      ttlMs: 120_000,
    })).toBe(false);
    expect(shouldServeCachedScores({
      rowCount: 2,
      newestFetchedAtMs: now - 121_000,
      now,
      ttlMs: 120_000,
    })).toBe(false);
  });

  it('keeps a just-checked isolate on the cache even if the row timestamp is old', () => {
    expect(shouldServeCachedScores({
      rowCount: 2,
      newestFetchedAtMs: now - 121_000,
      memoryCheckedAtMs: now - 10_000,
      now,
      ttlMs: 120_000,
    })).toBe(true);
  });
});

describe('planScoreSync', () => {
  it('does not write when the Central-day link and the scores already match', () => {
    expect(planScoreSync({
      vestRows,
      existingStats: [storedRow()],
      games: [milwaukee, { ...milwaukee, espnEventId: '402', completed: false }],
    })).toEqual({ clears: [], links: [], upserts: [] });
  });

  it('links the Central game day and stores a score that is not cached yet', () => {
    const plan = planScoreSync({
      vestRows: [{ game_id: 13, date: '2025-12-30', espn_event_id: null }],
      existingStats: [],
      games: [milwaukee],
    });

    expect(plan.links).toEqual([{ espnEventId: '401', gameId: 13 }]);
    expect(plan.upserts).toHaveLength(1);
    expect(plan.upserts[0].gameId).toBe(13);
    expect(plan.clears).toEqual([]);
  });

  it('clears a stale link on another row and rewrites a changed score', () => {
    const plan = planScoreSync({
      vestRows: [
        { game_id: 13, date: '2025-12-30', espn_event_id: null },
        { game_id: 99, date: '2025-12-31', espn_event_id: '401' },
      ],
      existingStats: [storedRow({ wisconsin_score: 70, game_id: null })],
      games: [milwaukee],
    });

    expect(plan.clears).toEqual([{ espnEventId: '401', gameId: 13 }]);
    expect(plan.links).toEqual([{ espnEventId: '401', gameId: 13 }]);
    expect(plan.upserts).toHaveLength(1);
  });

  it('does not blank a stored score when the new payload omits it', () => {
    const plan = planScoreSync({
      vestRows,
      existingStats: [storedRow()],
      games: [{
        ...milwaukee,
        wisconsinScore: null,
        opponentScore: null,
        wisconsinH1: null,
        venue: 'New Arena',
      }],
    });

    expect(plan.upserts).toHaveLength(1);
    expect(plan.upserts[0].game.wisconsinScore).toBe(80);
    expect(plan.upserts[0].game.wisconsinH1).toBe(40);
    expect(plan.upserts[0].game.venue).toBe('New Arena');
  });
});

describe('boxScoreNeedsWrite', () => {
  it('skips the write when ESPN has no box score or the cached box score matches', () => {
    const cached = { wi_fg: '30-60', wi_rebounds: 35, wi_leader_pts_name: 'Tonje' };
    expect(boxScoreNeedsWrite(cached, { wi_fg: null, wi_rebounds: null })).toBe(false);
    expect(boxScoreNeedsWrite(null, { wi_fg: '30-60' })).toBe(false);
    expect(boxScoreNeedsWrite(cached, { wi_fg: '30-60', wi_rebounds: 35, wi_leader_pts_name: 'Tonje' })).toBe(false);
  });

  it('writes when the summary adds a box score the row does not have', () => {
    expect(boxScoreNeedsWrite(
      { wi_fg: null, wi_rebounds: null },
      { wi_fg: '30-60', wi_rebounds: 35 },
    )).toBe(true);
  });

  it('does not write an empty summary, and a partial reply keeps stored fields', () => {
    const cached = {
      wi_fg: '37-77',
      wi_rebounds: 43,
      wi_leader_pts_name: 'John Blackwell',
      wisconsin_h1: 51,
      ot_periods: 1,
    };
    const empty = parseBoxScore({});
    expect(empty.ot_periods).toBeNull();
    expect(boxScoreNeedsWrite(cached, empty)).toBe(false);

    const partial = parseBoxScore({
      boxscore: {
        teams: [{ team: { id: '275' }, statistics: [{ abbreviation: '3P%', displayValue: '35' }] }],
      },
    });
    expect(partial.wi_fg).toBeNull();
    expect(partial.ot_periods).toBeNull();
    expect(boxScoreNeedsWrite(cached, partial)).toBe(true);
    const merged = keepStoredBoxScore(cached, partial);
    expect(merged.wi_3pt_pct).toBe(35);
    expect(merged.wi_fg).toBe('37-77');
    expect(merged.wi_rebounds).toBe(43);
    expect(merged.wi_leader_pts_name).toBe('John Blackwell');
    expect(merged.wisconsin_h1).toBe(51);
    expect(merged.ot_periods).toBe(1);
  });
});
