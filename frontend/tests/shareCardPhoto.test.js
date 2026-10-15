import test from 'node:test';
import assert from 'node:assert/strict';
import { photoSource } from '../src/utils/shareCard.js';

test('cross-origin photos load through the same-origin proxy', () => {
  assert.equal(photoSource('https://pub-abc.r2.dev/a.jpg', 'https://coffee.erikrole.com'), '/api/photo?url=https%3A%2F%2Fpub-abc.r2.dev%2Fa.jpg');
});

test('same-origin and local photos are used as they are', () => {
  assert.equal(photoSource('/api/photos/a.jpg', 'http://localhost:3000'), '/api/photos/a.jpg');
  assert.equal(photoSource('https://coffee.erikrole.com/x.jpg', 'https://coffee.erikrole.com'), 'https://coffee.erikrole.com/x.jpg');
});
