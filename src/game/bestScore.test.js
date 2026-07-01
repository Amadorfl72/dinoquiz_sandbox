const BestScoreManager = require('./bestScore');

describe('BestScoreManager', () => {
  let originalLocalStorage;
  let originalWindow;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    originalWindow = global.window;

    const store = {};
    global.localStorage = {
      getItem: jest.fn((key) => store[key] ?? null),
      setItem: jest.fn((key, value) => { store[key] = String(value); }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
      key: jest.fn((i) => Object.keys(store)[i] ?? null),
      get length() { return Object.keys(store).length; }
    };
    global.window = { localStorage: global.localStorage };
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    global.window = originalWindow;
    jest.restoreAllMocks();
  });

  describe('best score persistence', () => {
    it('should load a persisted best score from localStorage', () => {
      global.localStorage.setItem('bestScore', '1500');
      const manager = new BestScoreManager();
      expect(manager.getBestScore()).toBe(1500);
      expect(global.localStorage.getItem).toHaveBeenCalledWith('bestScore');
    });

    it('should default best score to 0 when no value is stored', () => {
      const manager = new BestScoreManager();
      expect(manager.getBestScore()).toBe(0);
    });

    it('should persist a new best score to localStorage', () => {
      const manager = new BestScoreManager();
      manager.updateBestScore(2000);
      expect(global.localStorage.setItem).toHaveBeenCalledWith('bestScore', '2000');
      expect(manager.getBestScore()).toBe(2000);
    });

    it('should not overwrite a higher best score with a lower score', () => {
      global.localStorage.setItem('bestScore', '5000');
      const manager = new BestScoreManager();
      manager.updateBestScore(1000);
      expect(manager.getBestScore()).toBe(5000);
      expect(global.localStorage.setItem).not.toHaveBeenCalledWith('bestScore', '1000');
    });

    it('should overwrite best score only when the new score is strictly greater', () => {
      global.localStorage.setItem('bestScore', '3000');
      const manager = new BestScoreManager();
      manager.updateBestScore(3000);
      expect(manager.getBestScore()).toBe(3000);
      expect(global.localStorage.setItem).not.toHaveBeenCalled();

      manager.updateBestScore(3001);
      expect(manager.getBestScore()).toBe(3001);
      expect(global.localStorage.setItem).toHaveBeenCalledWith('bestScore', '3001');
    });

    it('should handle non-numeric stored values gracefully', () => {
      global.localStorage.setItem('bestScore', 'not-a-number');
      const manager = new BestScoreManager();
      expect(manager.getBestScore()).toBe(0);
    });

    it('should reset best score to 0 when cleared', () => {
      global.localStorage.setItem('bestScore', '9999');
      const manager = new BestScoreManager();
      manager.reset();
      expect(manager.getBestScore()).toBe(0);
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('bestScore');
    });
  });

  describe('localStorage disabled / null', () => {
    it('should continue normally when localStorage is null (TRIOFSND-48)', () => {
      global.window = { localStorage: null };
      expect(() => new BestScoreManager()).not.toThrow();
      const manager = new BestScoreManager();
      expect(manager.getBestScore()).toBe(0);
      expect(() => manager.updateBestScore(500)).not.toThrow();
      expect(manager.getBestScore()).toBe(500);
    });

    it('should continue normally when window is undefined', () => {
      global.window = undefined;
      expect(() => new BestScoreManager()).not.toThrow();
      const manager = new BestScoreManager();
      expect(manager.getBestScore()).toBe(0);
      expect(() => manager.updateBestScore(750)).not.toThrow();
      expect(manager.getBestScore()).toBe(750);
    });

    it('should continue normally when localStorage.getItem throws', () => {
      global.localStorage = {
        getItem: jest.fn(() => { throw new Error('SecurityError: access denied'); }),
        setItem: jest.fn(() => { throw new Error('SecurityError: access denied'); }),
        removeItem: jest.fn(() => { throw new Error('SecurityError: access denied'); }),
        clear: jest.fn(() => { throw new Error('SecurityError: access denied'); })
      };
      global.window = { localStorage: global.localStorage };

      expect(() => new BestScoreManager()).not.toThrow();
      const manager = new BestScoreManager();
      expect(manager.getBestScore()).toBe(0);
      expect(() => manager.updateBestScore(300)).not.toThrow();
      expect(manager.getBestScore()).toBe(300);
    });

    it('should continue normally when localStorage.setItem throws on write', () => {
      const store = {};
      global.localStorage = {
        getItem: jest.fn((key) => store[key] ?? null),
        setItem: jest.fn(() => { throw new Error('QuotaExceededError'); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { for (const k of Object.keys(store)) delete store[k]; })
      };
      global.window = { localStorage: global.localStorage };

      const manager = new BestScoreManager();
      expect(() => manager.updateBestScore(800)).not.toThrow();
      expect(manager.getBestScore()).toBe(800);
    });

    it('should not throw during game initialization when localStorage is disabled', () => {
      global.window = { localStorage: null };
      const initGame = () => {
        const manager = new BestScoreManager();
        return { bestScore: manager.getBestScore(), manager };
      };
      expect(initGame).not.toThrow(TypeError);
      const result = initGame();
      expect(result.bestScore).toBe(0);
    });

    it('should keep in-memory best score consistent even if persistence fails', () => {
      global.localStorage = {
        getItem: jest.fn(() => null),
        setItem: jest.fn(() => { throw new Error('persist failed'); }),
        removeItem: jest.fn(() => {}),
        clear: jest.fn(() => {})
      };
      global.window = { localStorage: global.localStorage };

      const manager = new BestScoreManager();
      manager.updateBestScore(1200);
      manager.updateBestScore(1500);
      expect(manager.getBestScore()).toBe(1500);
    });
  });
});
