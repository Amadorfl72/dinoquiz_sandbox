describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  let scoreManager;
  let store;

  beforeEach(() => {
    store = {};

    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
    };

    // Mock DOM element for message
    document.body.innerHTML = '<div id="message"></div>';

    // Mock scoreManager module
    jest.resetModules();
    scoreManager = require('./scoreManager');
  });

  test('1) Best score persists after close/reopen', () => {
    scoreManager.updateBestScore(150);

    // Simulate close/reopen by re-instantiating or re-fetching
    jest.resetModules();
    const newScoreManagerInstance = require('./scoreManager');

    expect(newScoreManagerInstance.getBestScore()).toBe(150);
  });

  test('2) New best updates localStorage and shows message', () => {
    scoreManager.updateBestScore(100);
    const isNewBest = scoreManager.updateBestScore(120);

    expect(isNewBest).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('bestScore', '120');
    expect(document.getElementById('message').textContent).toContain('New Best Score');
  });

  test('3) Tie does not update or show message', () => {
    scoreManager.updateBestScore(120);
    const isNewBest = scoreManager.updateBestScore(120);

    expect(isNewBest).toBe(false);
    expect(localStorage.setItem).not.toHaveBeenCalledWith('bestScore', '120');
    expect(document.getElementById('message').textContent).toBe('');
  });

  test('4) Disabled localStorage doesn\'t block game and shows no error', () => {
    // Simulate disabled localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(() => { throw new Error('Access denied'); }),
        setItem: jest.fn(() => { throw new Error('Access denied'); }),
      },
      writable: true
    });

    jest.resetModules();
    const safeScoreManager = require('./scoreManager');

    let result;
    expect(() => {
      result = safeScoreManager.updateBestScore(200);
    }).not.toThrow();

    expect(result).toBe(true); // Should still return true for new best in memory
    expect(document.getElementById('message').textContent).toBe(''); // No error message shown
  });
});
