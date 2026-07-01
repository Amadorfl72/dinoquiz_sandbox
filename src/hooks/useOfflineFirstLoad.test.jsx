import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useOfflineFirstLoad } from './useOfflineFirstLoad';

describe('useOfflineFirstLoad hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const setOnlineStatus = (online) => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: online,
    });
  };

  it('returns show=true and the friendly message on first time load while offline', () => {
    setOnlineStatus(false);
    localStorage.clear();

    const { result } = renderHook(() => useOfflineFirstLoad());

    expect(result.current.show).toBe(true);
    expect(result.current.message).toBe(
      'Conéctate la primera vez para descargar el juego'
    );
  });

  it('returns show=false on first time load while online', () => {
    setOnlineStatus(true);
    localStorage.clear();

    const { result } = renderHook(() => useOfflineFirstLoad());

    expect(result.current.show).toBe(false);
    expect(result.current.message).toBeNull();
  });

  it('returns show=false on subsequent loads while offline', () => {
    setOnlineStatus(false);
    localStorage.setItem('triofsnd:hasLoadedBefore', 'true');

    const { result } = renderHook(() => useOfflineFirstLoad());

    expect(result.current.show).toBe(false);
    expect(result.current.message).toBeNull();
  });

  it('marks the app as loaded before after a successful online first load', () => {
    setOnlineStatus(true);
    localStorage.clear();

    const { result, rerender } = renderHook(() => useOfflineFirstLoad());

    result.current.markAsLoadedBefore();
    expect(localStorage.getItem('triofsnd:hasLoadedBefore')).toBe('true');

    setOnlineStatus(false);
    rerender();

    expect(result.current.show).toBe(false);
  });

  it('does not expose technical error strings in the message', () => {
    setOnlineStatus(false);
    localStorage.clear();

    const { result } = renderHook(() => useOfflineFirstLoad());

    expect(result.current.message).not.toMatch(/error|exception|undefined/i);
  });
});
