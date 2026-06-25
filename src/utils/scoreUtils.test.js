const { updateBestScore } = require('./scoreUtils');

describe('TRIOFSND-40: Actualizar mejor puntuación en localStorage', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] || null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debería actualizar localStorage y devolver true si la puntuación actual es mayor que la guardada', () => {
    mockStorage['bestScore'] = '100';
    
    const isNewBestScore = updateBestScore(150);
    
    expect(localStorage.setItem).toHaveBeenCalledWith('bestScore', '150');
    expect(isNewBestScore).toBe(true);
  });

  it('no debería actualizar localStorage y devolver false si la puntuación actual es menor que la guardada', () => {
    mockStorage['bestScore'] = '200';
    
    const isNewBestScore = updateBestScore(150);
    
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(isNewBestScore).toBe(false);
  });

  it('no debería actualizar localStorage y devolver false si la puntuación actual es igual a la guardada', () => {
    mockStorage['bestScore'] = '150';
    
    const isNewBestScore = updateBestScore(150);
    
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(isNewBestScore).toBe(false);
  });

  it('debería actualizar localStorage y devolver true si no hay puntuación guardada previamente', () => {
    const isNewBestScore = updateBestScore(50);
    
    expect(localStorage.setItem).toHaveBeenCalledWith('bestScore', '50');
    expect(isNewBestScore).toBe(true);
  });
});