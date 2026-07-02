const { endGame } = require('./game');

describe('TRIOFSND-40: Actualizar mejor puntuación en localStorage', () => {
  let messageElement;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="new-best-score-message" style="display: none;"></div>';
    messageElement = document.getElementById('new-best-score-message');
  });

  test('debería actualizar la mejor puntuación en localStorage si la actual es mayor', () => {
    localStorage.setItem('bestScore', '100');
    endGame(150);
    expect(localStorage.getItem('bestScore')).toBe('150');
  });

  test('debería mostrar el mensaje de nueva mejor puntuación si la actual es mayor', () => {
    localStorage.setItem('bestScore', '100');
    endGame(150);
    expect(messageElement.style.display).not.toBe('none');
  });

  test('no debería actualizar la mejor puntuación en localStorage si la actual es menor', () => {
    localStorage.setItem('bestScore', '200');
    endGame(150);
    expect(localStorage.getItem('bestScore')).toBe('200');
  });

  test('no debería mostrar el mensaje de nueva mejor puntuación si la actual es menor', () => {
    localStorage.setItem('bestScore', '200');
    endGame(150);
    expect(messageElement.style.display).toBe('none');
  });

  test('no debería actualizar ni mostrar el mensaje si la puntuación es igual a la mejor', () => {
    localStorage.setItem('bestScore', '100');
    endGame(100);
    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(messageElement.style.display).toBe('none');
  });

  test('debería actualizar la mejor puntuación si no existe una previa y la actual es mayor que 0', () => {
    endGame(50);
    expect(localStorage.getItem('bestScore')).toBe('50');
    expect(messageElement.style.display).not.toBe('none');
  });

  test('no debería actualizar ni mostrar el mensaje si la puntuación es 0 y no hay previa', () => {
    endGame(0);
    expect(localStorage.getItem('bestScore')).toBe(null);
    expect(messageElement.style.display).toBe('none');
  });
});
