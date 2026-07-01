describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  let mockLocalStorage;
  let mockMessageElement;

  beforeEach(() => {
    mockLocalStorage = {
      store: {},
      getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
      setItem: jest.fn((key, value) => { mockLocalStorage.store[key] = value.toString(); }),
      clear: jest.fn(() => { mockLocalStorage.store = {}; }),
      removeItem: jest.fn((key) => { delete mockLocalStorage.store[key]; })
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });

    mockMessageElement = document.createElement('div');
    mockMessageElement.id = 'best-score-message';
    mockMessageElement.style.display = 'none';
    document.body.appendChild(mockMessageElement);
    
    jest.resetModules();
  });

  afterEach(() => {
    document.body.removeChild(mockMessageElement);
  });

  test('1) Best score persists after close/reopen', () => {
    const { recordScore } = require('../game');
    recordScore(100);
    
    // Simulate close/reopen by clearing module cache
    jest.resetModules();
    
    const { getBestScore } = require('../game');
    expect(getBestScore()).toBe(100);
  });

  test('2) New best updates localStorage and shows message', () => {
    const { recordScore } = require('../game');
    const isNewBest = recordScore(150);
    
    expect(isNewBest).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('bestScore', '150');
    
    const messageEl = document.getElementById('best-score-message');
    expect(messageEl.textContent).not.toBe('');
    expect(messageEl.style.display).not.toBe('none');
  });

  test('3) Tie does not update or show message', () => {
    const { recordScore } = require('../game');
    recordScore(200);
    mockLocalStorage.setItem.mockClear();
    
    const isNewBest = recordScore(200);
    expect(isNewBest).toBe(false);
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    
    const messageEl = document.getElementById('best-score-message');
    expect(messageEl.style.display).toBe('none');
    expect(messageEl.textContent).toBe('');
  });

  test('4) Disabled localStorage doesn\'t block game and shows no error', () => {
    // Simulate disabled localStorage (null access)
    Object.defineProperty(window, 'localStorage', {
      value: null,
      configurable: true
    });

    const { recordScore, getBestScore } = require('../game');
    
    expect(() => {
      recordScore(300);
      getBestScore();
    }).not.toThrow();
    
    const messageEl = document.getElementById('best-score-message');
    expect(messageEl.style.display).toBe('none');
    expect(messageEl.textContent).toBe('');
  });
});