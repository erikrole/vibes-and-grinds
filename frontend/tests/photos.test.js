import test from 'node:test';
import assert from 'node:assert/strict';
import { photoVariantKey, photoVariantLayout, photoVariantUrl, PHOTO_R2_ORIGIN } from '../../shared/photos.mjs';

test('managed photos use versioned CDN variants without rewriting unrelated sources', () => {
  assert.equal(photoVariantUrl(`${PHOTO_R2_ORIGIN}/old%20photo.jpg`, 160), 'https://images.erikrole.com/variants/v1/160/old%20photo.jpg.webp');
  assert.equal(photoVariantUrl('/api/photos/a.jpg', 320), '/api/photos/variants/v1/320/a.jpg.webp');
  for (const value of ['https://elsewhere.example/a.jpg', `${PHOTO_R2_ORIGIN}/a.jpg?token=x`, `${PHOTO_R2_ORIGIN}/variants/v1/160/a.jpg.webp`, 'blob:local', '']) {
    assert.equal(photoVariantUrl(value), value);
  }
  assert.throws(() => photoVariantKey('../private', 160));
  assert.throws(() => photoVariantKey('a.jpg', 42));
});

test('card variants crop centrally and detail variants preserve orientation and aspect', () => {
  assert.deepEqual(photoVariantLayout(4000, 3000, 160), { sx: 500, sy: 0, sw: 3000, sh: 3000, width: 160, height: 160 });
  assert.deepEqual(photoVariantLayout(3000, 4000, 1600), { sx: 0, sy: 0, sw: 3000, sh: 4000, width: 1200, height: 1600 });
  assert.equal(photoVariantLayout(100, 80, 320).width, 80);
  assert.equal(photoVariantLayout(100, 80, 1600).width, 100);
});
