import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useToast from './useToast';

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts with no toast', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toBe(null);
  });

  it('show() sets a toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.show('hello'));
    expect(result.current.toast).toMatchObject({ message: 'hello', type: 'success' });
  });

  it('auto-dismisses after the configured duration', () => {
    const { result } = renderHook(() => useToast(1000));
    act(() => result.current.show('bye'));
    expect(result.current.toast).not.toBe(null);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.toast).toBe(null);
  });

  it('honors per-toast duration override', () => {
    const { result } = renderHook(() => useToast(5000));
    act(() => result.current.show('quick', 'success', { duration: 500 }));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.toast).toBe(null);
  });

  it('dismiss() clears the toast after exit animation', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.show('hi'));
    act(() => result.current.dismiss());
    expect(result.current.exiting).toBe(true);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.toast).toBe(null);
  });

  it('show() accepts a custom type', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.show('oops', 'error'));
    expect(result.current.toast.type).toBe('error');
  });
});
