import assert from 'node:assert/strict';
import test from 'node:test';
import {
  currentSeasonEndYear,
  dominantSeasonLabel,
  seasonEndYear,
  seasonChoices,
  seasonHasCompletedGames,
  seasonLabel,
  seasonTitle,
  vestSeasonFromSearch,
} from '../src/utils/vestSeason.js';

test('college basketball seasons roll over in July', () => {
  assert.equal(seasonEndYear('2025-11-03'), 2026);
  assert.equal(seasonEndYear('2026-02-17'), 2026);
  assert.equal(seasonEndYear('2026-06-30'), 2026);
  assert.equal(seasonEndYear('2026-07-01'), 2027);
  assert.equal(seasonEndYear('2026-11-02'), 2027);
  assert.equal(seasonEndYear(''), null);
  assert.equal(seasonLabel(2026), '25–26');
  assert.equal(seasonLabel(2027), '26–27');
  assert.equal(seasonTitle(2027), '2026–27');
});

test('the current season follows the Chicago calendar', () => {
  assert.equal(currentSeasonEndYear(new Date('2026-10-12T16:00:00Z')), 2027);
  assert.equal(currentSeasonEndYear(new Date('2026-03-01T18:00:00Z')), 2026);
  assert.equal(currentSeasonEndYear(new Date('2026-07-01T04:30:00Z')), 2026);
  assert.equal(currentSeasonEndYear(new Date('2026-07-01T06:30:00Z')), 2027);
});

test('a season with no completed games is still preseason', () => {
  const history = [
    { date: '2025-11-03', result: 'W' },
    { date: '2026-02-17', result: 'L' },
  ];
  assert.equal(seasonHasCompletedGames(history, 2026), true);
  assert.equal(seasonHasCompletedGames(history, 2027), false);
  assert.equal(dominantSeasonLabel(history), '25–26');
  assert.equal(dominantSeasonLabel([...history, { date: '2026-11-02', result: 'W' }]), 'All seasons');
  assert.equal(dominantSeasonLabel([]), '');
});

test('the season switcher keeps an explicit year and offers history beside the current season', () => {
  const now = new Date('2026-10-12T16:00:00Z');
  assert.equal(vestSeasonFromSearch('?app=vest', now), 2027);
  assert.equal(vestSeasonFromSearch('?vestSeason=2026', now), 2026);
  assert.equal(vestSeasonFromSearch('?season=2024', now), 2027);
  assert.deepEqual(seasonChoices([{ date: '2025-11-03' }, { date: '2026-02-17' }], 2027, now), [2027, 2026]);
});
