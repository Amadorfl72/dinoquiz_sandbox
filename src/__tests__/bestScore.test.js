const { handleGameEnd } = require('../gameLogic');

describe('TRIOFSND-40: Actualizar mejor puntuación en localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('debería actualizar la mejor puntuación en localStorage y retornar isNewBestScore=true si la puntuación actual es mayor', () => {
    localStorage.setItem('bestScore', '100');
    
    const result = handleGameEnd(150);
    
    expect(localStorage.getItem('bestScore')).toBe('150');
    expect(result.isNewBestScore).toBe(true);
  });

  it('no debería actualizar la mejor puntuación y retornar isNewBestScore=false si la puntuación actual es menor', () => {
    localStorage.setItem('bestScore', '200');
    
    const result = handleGameEnd(150);
    
    expect(localStorage.getItem('bestScore')).toBe('200');
    expect(result.isNewBestScore).toBe(false);
  });

  it('debería establecer la mejor puntuación y retornar isNewBestScore=true si no existe puntuación previa en localStorage', () => {
    expect(localStorage.getItem('bestScore')).toBeNull();
    
    const result = handleGameEnd(50);
    
    expect(localStorage.getItem('bestScore')).toBe('50');
    expect(result.isNewBestScore).toBe(true);
  });

  it('no debería actualizar la mejor puntuación y retornar isNewBestScore=false si la puntuación actual es igual a la guardada', () => {
    localStorage.setItem('bestScore', '100');
    
    const result = handleGameEnd(100);
    
    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(result.isNewBestScore).toBe(false);
  });
});