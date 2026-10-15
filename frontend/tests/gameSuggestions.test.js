import test from 'node:test';
import assert from 'node:assert/strict';
import { gameFill, gameLabel } from '../src/utils/gameSuggestions.js';

const away = { sport: 'Football', opponent: 'UCLA', location: '@', city: 'Pasadena, CA' };

test('an empty form takes sport, opponent and city', () => {
  assert.deepEqual(gameFill({ sport: '', opponent: '', city: '' }, away), { sport: 'Football', opponent: 'UCLA', city: 'Pasadena, CA' });
});

test('typed values are never overwritten', () => {
  assert.deepEqual(gameFill({ sport: "Men's Hockey", opponent: ' ', city: 'LA' }, away), { opponent: 'UCLA' });
  assert.deepEqual(gameFill({ sport: 'Football', opponent: 'UCLA', city: 'Pasadena, CA' }, away), {});
});

test('a Madison game never fills the city', () => {
  const home = { sport: "Men's Basketball", opponent: 'Denver', location: 'vs', city: 'Madison, WI' };
  assert.deepEqual(gameFill({}, home), { sport: "Men's Basketball", opponent: 'Denver' });
});

test('labels say at, vs or neutral', () => {
  assert.equal(gameLabel(away), 'Football at UCLA');
  assert.equal(gameLabel({ ...away, location: 'vs' }), 'Football vs UCLA');
  assert.equal(gameLabel({ ...away, location: 'N' }), 'Football vs (neutral) UCLA');
});
