'use strict';

const { createA11yAnnouncer } = require('./a11yAnnouncer');

describe('a11yAnnouncer (TRIOFSND-311)', () => {
  test('getRegion() lazily creates a single reusable role=status/aria-live=polite node', () => {
    const announcer = createA11yAnnouncer({ documentObj: document });

    const region = announcer.getRegion();

    expect(region).toBeTruthy();
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.className).toContain('sr-only');
    expect(region.textContent).toBe('');
    // Same node every time, never a second competing region.
    expect(announcer.getRegion()).toBe(region);
  });

  test('announce() writes synchronously to the region when the queue is idle', () => {
    const announcer = createA11yAnnouncer({ documentObj: document });

    announcer.announce('Ronda 1 de 10');

    expect(announcer.getRegion().textContent).toBe('Ronda 1 de 10');
  });

  test('ignores non-string or blank messages', () => {
    const announcer = createA11yAnnouncer({ documentObj: document });

    announcer.announce('');
    announcer.announce('   ');
    announcer.announce(null);
    announcer.announce(undefined);
    announcer.announce(42);

    expect(announcer.getRegion().textContent).toBe('');
  });

  test('a fast follow-up announcement is queued, never overlapping the one still "being read"', () => {
    jest.useFakeTimers();
    try {
      const announcer = createA11yAnnouncer({ documentObj: document, minDelayMs: 1000, msPerCharacter: 0 });
      const region = announcer.getRegion();

      announcer.announce('¡Genial, acertaste!');
      announcer.announce('Puntos: 3');

      // The second message must not be visible yet -- the first is still
      // within its estimated reading window.
      expect(region.textContent).toBe('¡Genial, acertaste!');

      jest.advanceTimersByTime(999);
      expect(region.textContent).toBe('¡Genial, acertaste!');

      jest.advanceTimersByTime(1);
      expect(region.textContent).toBe('Puntos: 3');
    } finally {
      jest.useRealTimers();
    }
  });

  test('three queued messages are announced in FIFO order, one at a time', () => {
    jest.useFakeTimers();
    try {
      const announcer = createA11yAnnouncer({ documentObj: document, minDelayMs: 500, msPerCharacter: 0 });
      const region = announcer.getRegion();
      const seen = [];

      announcer.announce('uno');
      announcer.announce('dos');
      announcer.announce('tres');

      seen.push(region.textContent);
      jest.advanceTimersByTime(500);
      seen.push(region.textContent);
      jest.advanceTimersByTime(500);
      seen.push(region.textContent);

      expect(seen).toEqual(['uno', 'dos', 'tres']);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a longer message keeps the queue busy longer than the minimum delay', () => {
    jest.useFakeTimers();
    try {
      const longMessage = 'x'.repeat(100);
      const announcer = createA11yAnnouncer({ documentObj: document, minDelayMs: 100, msPerCharacter: 10 });
      const region = announcer.getRegion();

      announcer.announce(longMessage);
      announcer.announce('siguiente');

      jest.advanceTimersByTime(999);
      expect(region.textContent).toBe(longMessage);

      jest.advanceTimersByTime(1);
      expect(region.textContent).toBe('siguiente');
    } finally {
      jest.useRealTimers();
    }
  });

  test('clear() drops queued/in-flight announcements, cancels the pending timer and blanks the region', () => {
    jest.useFakeTimers();
    try {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const announcer = createA11yAnnouncer({ documentObj: document, minDelayMs: 1000, msPerCharacter: 0 });
      const region = announcer.getRegion();

      announcer.announce('primero');
      announcer.announce('segundo');
      announcer.clear();

      expect(region.textContent).toBe('');
      expect(clearTimeoutSpy).toHaveBeenCalled();

      jest.advanceTimersByTime(5000);
      // Nothing left in the queue -- no further mutation.
      expect(region.textContent).toBe('');

      clearTimeoutSpy.mockRestore();
    } finally {
      jest.useRealTimers();
    }
  });

  test('a message announced after the queue has drained is written immediately again', () => {
    jest.useFakeTimers();
    try {
      const announcer = createA11yAnnouncer({ documentObj: document, minDelayMs: 200, msPerCharacter: 0 });
      const region = announcer.getRegion();

      announcer.announce('primero');
      jest.advanceTimersByTime(200);
      expect(region.textContent).toBe('primero');

      announcer.announce('segundo');
      expect(region.textContent).toBe('segundo');
    } finally {
      jest.useRealTimers();
    }
  });

  test('getRegion() returns null instead of throwing when no document is available', () => {
    const announcer = createA11yAnnouncer({ documentObj: {}, setTimeout: () => 0, clearTimeout: () => {} });

    expect(() => announcer.announce('hola')).not.toThrow();
    expect(announcer.getRegion()).toBeNull();
  });
});
