const fs = require('fs');
const path = require('path');

let html;
let js;

beforeAll(() => {
  html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  js = fs.readFileSync(path.resolve(__dirname, '../game.js'), 'utf8');
});

let container;
let localStorageMock;
let originalError;

function setupDOM(scoreValue) {
  document.documentElement.innerHTML = html;
  const scoreEl = document.getElementById('score');
  if (scoreEl && scoreValue !== undefined) {
    scoreEl.textContent = String(scoreValue);
  }
}

function loadGameScript() {
  // eslint-disable-next-line no-eval
  eval(js);
}

beforeEach(() => {
  localStorageMock = (() => {
    let store = {};
    return {
      getItem: jest.fn((key) => (key in store ? store[key] : null)),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      key: jest.fn((i) => Object.keys(store)[i] || null),
      get _store() {
        return store;
      }
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorageMock
  });

  originalError = console.error;
  console.error = jest.fn();

  setupDOM(0);
});

afterEach(() => {
  console.error = originalError;
  jest.restoreAllMocks();
});

describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  test('1) Best score persists after close/reopen', () => {
    localStorageMock.setItem('bestScore', 42);
    loadGameScript();

    const bestEl = document.getElementById('best');
    expect(bestEl).not.toBeNull();
    expect(bestEl.textContent).toContain('42');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('bestScore');
  });

  test('2) New best updates localStorage and shows message', () => {
    localStorageMock.setItem('bestScore', 10);
    loadGameScript();

    const scoreEl = document.getElementById('score');
    scoreEl.textContent = '25';

    const bestEl = document.getElementById('best');
    const prevBest = parseInt(bestEl.textContent, 10) || 0;

    const messageEl = document.getElementById('best-message');
    expect(messageEl).not.toBeNull();

    if (typeof window.onScoreChange === 'function') {
      window.onScoreChange(25);
    } else if (typeof window.updateBestScore === 'function') {
      window.updateBestScore(25);
    } else {
      scoreEl.dispatchEvent(new Event('input'));
    }

    expect(localStorageMock.setItem).toHaveBeenCalledWith('bestScore', '25');
    expect(bestEl.textContent).toContain('25');
    expect(parseInt(bestEl.textContent, 10)).toBeGreaterThan(prevBest);
    expect(messageEl.textContent.length).toBeGreaterThan(0);
    expect(messageEl.classList.contains('hidden')).toBe(false);
  });

  test('3) Tie does not update or show message', () => {
    localStorageMock.setItem('bestScore', 30);
    loadGameScript();

    const bestEl = document.getElementById('best');
    const messageEl = document.getElementById('best-message');
    messageEl.classList.add('hidden');
    messageEl.textContent = '';

    const setItemCallsBefore = localStorageMock.setItem.mock.calls.length;

    if (typeof window.onScoreChange === 'function') {
      window.onScoreChange(30);
    } else if (typeof window.updateBestScore === 'function') {
      window.updateBestScore(30);
    }

    const setItemCallsAfter = localStorageMock.setItem.mock.calls.length;
    expect(setItemCallsAfter).toBe(setItemCallsBefore);
    expect(bestEl.textContent).toContain('30');
    expect(messageEl.textContent).toBe('');
    expect(messageEl.classList.contains('hidden')).toBe(true);
  });

  test('4) Disabled localStorage does not block game and shows no error', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage is not available');
      }
    });

    expect(() => {
      loadGameScript();
    }).not.toThrow();

    expect(console.error).not.toHaveBeenCalled();

    const bestEl = document.getElementById('best');
    expect(bestEl).not.toBeNull();
    expect(bestEl.textContent).toMatch(/\d+/);

    const scoreEl = document.getElementById('score');
    expect(scoreEl).not.toBeNull();
    expect(() => {
      if (typeof window.onScoreChange === 'function') {
        window.onScoreChange(99);
      } else if (typeof window.updateBestScore === 'function') {
        window.updateBestScore(99);
      }
    }).not.toThrow();
  });
});
