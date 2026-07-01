const BestScoreService = require('./BestScoreService').default;

describe('BestScoreService', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = window.localStorage;
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  describe('Best score persistence', () => {
    beforeEach(() => {
      const mockLocalStorage = {
        store: {},
        getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
        setItem: jest.fn((key, value) => {
          mockLocalStorage.store[key] = value.toString();
        }),
        clear: jest.fn(() => {
          mockLocalStorage.store = {};
        }),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('should load best score from localStorage on initialization', () => {
      window.localStorage.setItem('bestScore', '1500');
      const service = new BestScoreService();
      expect(service.getBestScore()).toBe(1500);
    });

    it('should save new best score to localStorage when a higher score is achieved', () => {
      const service = new BestScoreService();
      service.updateScore(2000);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('bestScore', '2000');
      expect(service.getBestScore()).toBe(2000);
    });

    it('should not save to localStorage if the score is not a new high score', () => {
      window.localStorage.setItem('bestScore', '3000');
      const service = new BestScoreService();
      service.updateScore(1000);
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
      expect(service.getBestScore()).toBe(3000);
    });
  });

  describe('Error scenarios', () => {
    it('should continue normally when localStorage is disabled (null)', () => {
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: true,
        configurable: true,
      });

      // Should not throw TypeError: Cannot read property 'getItem' of null
      expect(() => {
        const service = new BestScoreService();
        expect(service.getBestScore()).toBe(0);
      }).not.toThrow();
    });

    it('should continue normally when localStorage.getItem throws an error', () => {
      const mockLocalStorage = {
        getItem: jest.fn(() => {
          throw new Error('SecurityError: The operation is insecure.');
        }),
        setItem: jest.fn(() => {
          throw new Error('QuotaExceededError');
        }),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });

      expect(() => {
        const service = new BestScoreService();
        expect(service.getBestScore()).toBe(0);
        service.updateScore(500); // Should not throw on save
      }).not.toThrow();
    });
  });
});