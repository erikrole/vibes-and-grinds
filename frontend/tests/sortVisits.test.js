import test from 'node:test';
import assert from 'node:assert/strict';
import { sortVisits } from '../src/utils/sortVisits.js';

const visits = [
  { id: 1, date: '2025-12-10', vibe_rating: 7.2, coffee_rating: 7.8, composite_score: 15 },
  { id: 2, date: '2026-08-28', vibe_rating: 8.7, coffee_rating: 8.9, composite_score: 17.6 },
];
test('the journal starts with the latest stop and the best ratings', () => {
  for (const sortBy of ['date', 'vibe', 'coffee', 'composite']) {
    assert.deepEqual(sortVisits(visits, sortBy).map((visit) => visit.id), [2, 1]);
    assert.deepEqual(sortVisits(visits, sortBy, true).map((visit) => visit.id), [1, 2]);
  }
  assert.deepEqual(visits.map((visit) => visit.id), [1, 2], 'Sorting must preserve the source collection');
});
