import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteVisit } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deleteVisit', () => {
  it('treats 404 as already deleted', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Visit not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } },
    )));

    await expect(deleteVisit(7)).resolves.toBeUndefined();
  });

  it('still rejects a failed delete', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Failed to delete visit' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )));

    await expect(deleteVisit(7)).rejects.toThrow('Failed to delete visit');
  });
});
