import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useLocalStorage from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses initialValue when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('k', { count: 0 }));
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it('reads existing value from storage on mount', () => {
    localStorage.setItem('k', JSON.stringify({ count: 7 }));
    const { result } = renderHook(() => useLocalStorage('k', { count: 0 }));
    expect(result.current[0]).toEqual({ count: 7 });
  });

  it('persists updates back to storage', () => {
    const { result } = renderHook(() => useLocalStorage('k', 0));
    act(() => result.current[1](42));
    expect(JSON.parse(localStorage.getItem('k'))).toBe(42);
  });

  it('falls back to initialValue when storage is corrupt', () => {
    localStorage.setItem('k', 'not json');
    const { result } = renderHook(() => useLocalStorage('k', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('remove() resets the in-memory value to the initial', () => {
    localStorage.setItem('k', JSON.stringify('saved'));
    const { result } = renderHook(() => useLocalStorage('k', 'init'));
    expect(result.current[0]).toBe('saved');
    act(() => result.current[2]());
    // The in-memory value resets; the persistence effect then writes the
    // initial value back to storage.
    expect(result.current[0]).toBe('init');
    expect(JSON.parse(localStorage.getItem('k'))).toBe('init');
  });

  it('survives setItem throwing (quota exceeded)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useLocalStorage('k', 0));
    expect(() => act(() => result.current[1](1))).not.toThrow();
    expect(result.current[0]).toBe(1);
    setItemSpy.mockRestore();
  });
});
