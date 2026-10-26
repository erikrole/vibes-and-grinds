import { describe, expect, it } from 'vitest';
import { fittedPhotoSize, prepareVisitPhoto, VISIT_PHOTO_JPEG_QUALITY, VISIT_PHOTO_MAX_EDGE } from './photoExport';

describe('fittedPhotoSize', () => {
  it('caps the long edge and leaves a small crop alone', () => {
    expect(fittedPhotoSize(4000, 5000)).toEqual({ width: 1280, height: 1600, scaled: true });
    expect(fittedPhotoSize(1200, 900)).toEqual({ width: 1200, height: 900, scaled: false });
    expect(fittedPhotoSize(0, 400)).toBeNull();
    expect(fittedPhotoSize('nope', 400)).toBeNull();
  });

  it('uses the display cap the journal actually needs', () => {
    expect(VISIT_PHOTO_MAX_EDGE).toBe(1600);
    expect(VISIT_PHOTO_JPEG_QUALITY).toBeLessThan(0.95);
  });
});

describe('prepareVisitPhoto', () => {
  it('returns the original file when the browser cannot read it', async () => {
    const file = new File(['not-an-image'], 'note.txt', { type: 'text/plain' });
    const originalCreate = globalThis.createImageBitmap;
    globalThis.createImageBitmap = async () => { throw new Error('decode failed'); };
    try {
      await expect(prepareVisitPhoto(file)).resolves.toBe(file);
    } finally {
      globalThis.createImageBitmap = originalCreate;
    }
  });

  it('re-encodes a photo whose long edge is over the cap', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'camera.jpg', { type: 'image/jpeg' });
    const originalCreate = globalThis.createImageBitmap;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    globalThis.createImageBitmap = async () => ({
      width: 4032,
      height: 3024,
      close() {},
    });
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback, type, quality) {
      expect(this.width).toBe(1600);
      expect(this.height).toBe(1200);
      expect(type).toBe('image/jpeg');
      expect(quality).toBe(0.92);
      callback(new Blob([new Uint8Array(80)], { type: 'image/jpeg' }));
    };
    try {
      const prepared = await prepareVisitPhoto(file);
      expect(prepared).not.toBe(file);
      expect(prepared.type).toBe('image/jpeg');
      expect(prepared.size).toBe(80);
    } finally {
      globalThis.createImageBitmap = originalCreate;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  });
});
