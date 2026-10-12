import assert from 'node:assert/strict';
import test from 'node:test';
import { outfitSampleNote, sampleTier } from '../src/utils/vestTrackerMath.js';

test('outfit win rates of three games or fewer stay marked as a small sample', () => {
  assert.equal(outfitSampleNote(0), 'No games yet');
  assert.equal(outfitSampleNote(1), 'Small sample');
  assert.equal(outfitSampleNote(3), 'Small sample');
  assert.equal(outfitSampleNote(4), '');
  assert.equal(sampleTier(1), 'tiny');
  assert.equal(sampleTier(3), 'small');
  assert.equal(sampleTier(13), 'solid');
});
