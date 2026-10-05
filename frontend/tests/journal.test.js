import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReturnVisitDraft, getShopVisitCounts, getRepeatVisits } from '../src/utils/repeats.js';
import { buildComparisons } from '../src/utils/comparisons.js';
import { computeSeasonReview, getCurrentSeason } from '../src/utils/yearReview.js';
const first = { id: 1, shop_id: 'shop-one', date: '2025-09-01', coffee_shop_name: 'Coffee Shop', city: 'Lincoln, NE', visit_type: 'road', sport: 'Cross Country', opponent: 'Old meet', coffee_order: 'Vanilla latte', vibe_rating: 8, coffee_rating: 9, composite_score: 17 };
const second = { ...first, id: 2, date: '2026-08-28', coffee_shop_place_id: 'apple:new', vibe_rating: 8.5, coffee_rating: 8.5, composite_score: 17 };
const branch = { ...first, id: 3, shop_id: 'shop-two', city: 'Seattle, WA', coffee_rating: 7, composite_score: 15 };

test('return visit keeps the shop and order, but resets ratings and event context', () => {
  const draft = buildReturnVisitDraft(second);
  assert.equal(draft.shop_id, 'shop-one'); assert.equal(draft.coffee_order, second.coffee_order);
  assert.equal(draft.sport, ''); assert.equal(draft.opponent, ''); assert.equal(draft.vibe_rating, ''); assert.equal(draft.coffee_rating, '');
  assert.notEqual(draft.date, second.date);
});
test('history and comparisons use the same shop identity and never merge chain branches by name', () => {
  const visits = [first, second, branch];
  assert.equal(Object.keys(getShopVisitCounts(visits)).length, 2);
  assert.equal(getRepeatVisits(visits, second).length, 2);
  const groups = buildComparisons(visits);
  assert.equal(groups.length, 2); assert.equal(groups[0].visits.length, 2);
  assert.equal(buildComparisons(visits, 'shop', 2).length, 1);
});
test('one-visit current seasons stay factual and a returning shop is not counted as new', () => {
  const review = computeSeasonReview([first, second], '2026-27', new Date(2026, 9, 4));
  assert.equal(review.totalVisits, 1); assert.equal(review.newShops, 0); assert.equal(review.mostVisitedShop, null);
  assert.equal(review.complete, false); assert.equal(review.persona, undefined);
  assert.equal(computeSeasonReview([first], '2025-26', new Date(2026, 9, 4)).complete, true);
  assert.match(getCurrentSeason(), /^\d{4}-\d{2}$/);
});
