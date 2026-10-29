import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstagramCaption, cityHashtag } from '../src/utils/instagramCaption.js';

test('city hashtags drop punctuation and the state', () => {
  assert.equal(cityHashtag('Iowa City, IA'), '#iowacitycoffee');
  assert.equal(cityHashtag("St. Paul's, MN"), '#stpaulscoffee');
  assert.equal(cityHashtag(''), '');
  assert.equal(cityHashtag(undefined), '');
});

test('the caption lists the shop, scores, order, game, notes, and hashtags', () => {
  const caption = buildInstagramCaption({
    coffee_shop_name: 'Prairie Lights Café',
    city: 'Iowa City, IA',
    vibe_rating: 8.5,
    coffee_rating: 9,
    composite_score: 17.5,
    coffee_order: 'oat cortado',
    sport: 'Basketball',
    opponent: '@ Iowa',
    notes: '  Great  window seats. ',
  });

  assert.equal(caption, [
    '☕ Prairie Lights Café · Iowa City, IA',
    '',
    '✨ Vibe 8.5/10',
    '☕ Coffee 9.0/10',
    '🏆 Total 17.5/20',
    '🥤 Ordered: Oat Cortado',
    '🏟️ Basketball at Iowa',
    '',
    'Great window seats.',
    '',
    '#vibesandgrinds #coffee #coffeeshop #iowacitycoffee',
  ].join('\n'));
});

test('optional lines drop out when a visit has no order, game, notes, or city', () => {
  const caption = buildInstagramCaption({ coffee_shop_name: 'Ope Coffee', vibe_rating: 7, coffee_rating: 6, composite_score: 13 });
  assert.doesNotMatch(caption, /Ordered|🏟️/);
  assert.equal(caption.split('\n')[0], '☕ Ope Coffee');
  assert.ok(caption.endsWith('#vibesandgrinds #coffee #coffeeshop'));
});

test('home visits leave out the game line', () => {
  const caption = buildInstagramCaption({ coffee_shop_name: 'Colectivo', visit_type: 'home', sport: 'Basketball', opponent: 'Iowa' });
  assert.doesNotMatch(caption, /🏟️/);
});

test('long notes are trimmed and missing scores show a dash', () => {
  const caption = buildInstagramCaption({ coffee_shop_name: 'X', notes: 'a'.repeat(500) });
  const notesLine = caption.split('\n').find((line) => line.startsWith('aaa'));
  assert.equal(notesLine.length, 300);
  assert.ok(notesLine.endsWith('…'));
  assert.match(caption, /Vibe —\/10/);
});
