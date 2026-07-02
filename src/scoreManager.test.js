describe('TRIOFSND-40: Actualizar mejor puntuación en localStorage', () => {
  let endGame;
  let getBestScore;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="best-score-message" style="display: none;">¡Nueva mejor puntuación!</div>
    `;

    // Mock localStorage
    const store = {};
    const localStorageMock = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        for (const key in store) {
          delete store[key];
        }
      })
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

    // Load the module
    jest.resetModules();
    const scoreManager = require('./scoreManager');
    endGame = scoreManager.endGame;
    getBestScore = scoreManager.getBestScore;
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('should update localStorage and show message if current score is greater than saved score', () => {
    window.localStorage.setItem('bestScore', '100');
    
    endGame(150);

    expect(window.localStorage.setItem).toHaveBeenCalledWith('bestScore', '150');
    const messageElement = document.getElementById('best-score-message');
    expect(messageElement.style.display).toBe('block');
  });

  it('should not update localStorage and not show message if current score is less than saved score', () => {
    window.localStorage.setItem('bestScore', '200');
    
    endGame(150);

    expect(window.localStorage.setItem).not.toHaveBeenCalledWith('bestScore', '150');
    const messageElement = document.getElementById('best-score-message');
    expect(messageElement.style.display).toBe('none');
  });

  it('should update localStorage and show message if there is no saved score', () => {
    endGame(50);

    expect(window.localStorage.setItem).toHaveBeenCalledWith('bestScore', '50');
    const messageElement = document.getElementById('best-score-message');
    expect(messageElement.style.display).toBe('block');
  });

  it('should not update localStorage and not show message if current score is equal to saved score', () => {
    window.localStorage.setItem('bestScore', '100');
    
    endGame(100);

    expect(window.localStorage.setItem).not.toHaveBeenCalledWith('bestScore', '100');
    const messageElement = document.getElementById('best-score-message');
    expect(messageElement.style.display).toBe('none');
  });
});