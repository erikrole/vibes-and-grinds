import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useVisitJournal from './useVisitJournal';

const stored = [{ id: 7, date: '2026-01-01', coffee_shop_name: 'Cafe', city: 'Madison' }];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('handleDeleteVisit', () => {
  it('removes the visit from the list when the server says it is already deleted', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, options = {}) => {
      if (options.method === 'DELETE') {
        return new Response(JSON.stringify({ error: 'Visit not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(stored), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));

    const showToast = vi.fn();
    const { result } = renderHook(() => useVisitJournal(showToast, ''));
    await waitFor(() => expect(result.current.visits).toHaveLength(1));

    await result.current.handleDeleteVisit(7);

    await waitFor(() => expect(result.current.visits).toEqual([]));
    expect(result.current.error).toBeNull();
  });
});
