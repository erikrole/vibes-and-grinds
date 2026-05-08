import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useDarkMode from './useDarkMode';

const KEY = 'vibes-and-grinds:dark-mode';

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('respects an explicit "true" preference', () => {
    localStorage.setItem(KEY, 'true');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('respects an explicit "false" preference', () => {
    localStorage.setItem(KEY, 'false');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(false);
  });

  it('falls back to prefers-color-scheme when no stored value', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    const { result } = renderHook(() => useDarkMode());
    expect(result.current[0]).toBe(true);
  });

  it('toggle flips the boolean and persists it', () => {
    localStorage.setItem(KEY, 'false');
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
