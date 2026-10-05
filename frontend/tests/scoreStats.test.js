import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScoreStats } from '../src/utils/scoreStats.js';

test('score summaries use exact owner outfits, retain one-game samples, and distinguish missing halftime scores', () => {
  const games = [
    { espn_event_id: 'a', date: '2026-03-01', outfit: 'Old label', wisconsin_score: 80, opponent_score: 70, wisconsin_h1: null, opponent_h1: null },
    { espn_event_id: 'b', date: '2026-03-01', outfit: 'Black Pullover', wisconsin_score: 60, opponent_score: 65, wisconsin_h1: 0, opponent_h1: 0 },
    { espn_event_id: 'future', wisconsin_score: null, opponent_score: null },
  ];
  const stats = computeScoreStats(games, [{ espn_event_id: 'a', date: '2026-03-01', outfit: 'Black Vest', location: 'N', overtime: true }]);
  assert.equal(stats.games, 2);
  assert.equal(stats.avgScored, 70);
  assert.equal(stats.avgAllowed, 67.5);
  assert.equal(stats.avgMargin, 2.5);
  assert.deepEqual(stats.halftime, { games: 1, led: 0, trailed: 0, tied: 1 });
  assert.deepEqual(stats.outfits.map(group => [group.outfit, group.games]), [['Black Pullover', 1], ['Black Vest', 1]]);
  assert.equal(stats.completed[0].location, 'N');
  assert.equal(stats.completed[0].overtime, true);
  assert.equal(computeScoreStats([]), null);
});
