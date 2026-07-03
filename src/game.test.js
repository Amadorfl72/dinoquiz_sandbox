const { endGame, handleGameEnd, getBestScore, showNewBestScoreMessage, showNewHighScoreMessage } = require('./js/gameLogic');

describe('TRIOFSND-40: Actualizar mejor puntuación en localStorage', () => {
  let messageElement;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML =
      '<div id="new-best-score-message" style="display: none;"></div>';
    messageElement = document.getElementById('new-best-score-message');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('debería actualizar la mejor puntuación en localStorage si la actual es mayor', () => {
    localStorage.setItem('bestScore', '100');
    endGame(150);
    expect(localStorage.getItem('bestScore')).toBe('150');
  });

  test('debería mostrar el mensaje de nueva mejor puntuación si la actual es mayor', () => {
    localStorage.setItem('bestScore', '100');
    endGame(150);
    expect(messageElement.style.display).toBe('block');
  });

  test('debería devolver isNewBestScore=true si la actual es mayor', () => {
    localStorage.setItem('bestScore', '100');
    const result = endGame(150);
    expect(result.isNewBestScore).toBe(true);
    expect(result.bestScore).toBe(150);
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
    const result = endGame(100);
    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(messageElement.style.display).toBe('none');
    expect(result.isNewBestScore).toBe(false);
  });

  test('debería actualizar la mejor puntuación si no existe una previa y la actual es mayor que 0', () => {
    endGame(50);
    expect(localStorage.getItem('bestScore')).toBe('50');
    expect(messageElement.style.display).toBe('block');
  });

  test('debería actualizar la mejor puntuación y mostrar el mensaje si no existe una previa y la puntuación es 0', () => {
    const result = endGame(0);
    expect(localStorage.getItem('bestScore')).toBe('0');
    expect(messageElement.style.display).toBe('block');
    expect(result.isNewBestScore).toBe(true);
  });

  test('debería devolver el bestScore existente cuando no hay nueva mejor puntuación', () => {
    localStorage.setItem('bestScore', '200');
    const result = endGame(150);
    expect(result.isNewBestScore).toBe(false);
    expect(result.bestScore).toBe(200);
  });

  test('el mensaje debería ocultarse automáticamente después de 3000ms', () => {
    localStorage.setItem('bestScore', '100');
    endGame(150);
    expect(messageElement.style.display).toBe('block');
    jest.advanceTimersByTime(3000);
    expect(messageElement.style.display).toBe('none');
  });

  test('el mensaje no debería ocultarse antes de 3000ms', () => {
    localStorage.setItem('bestScore', '100');
    endGame(150);
    jest.advanceTimersByTime(2999);
    expect(messageElement.style.display).toBe('block');
  });

  test('handleGameEnd debería comportarse igual que endGame', () => {
    localStorage.setItem('bestScore', '100');
    const result = handleGameEnd(150);
    expect(localStorage.getItem('bestScore')).toBe('150');
    expect(result.isNewBestScore).toBe(true);
    expect(result.bestScore).toBe(150);
    expect(messageElement.style.display).toBe('block');
  });

  test('getBestScore debería devolver la mejor puntuación guardada', () => {
    localStorage.setItem('bestScore', '250');
    expect(getBestScore()).toBe(250);
  });

  test('getBestScore debería devolver 0 si no hay puntuación guardada', () => {
    expect(getBestScore()).toBe(0);
  });

  test('getBestScore debería devolver 0 si el valor guardado no es numérico', () => {
    localStorage.setItem('bestScore', 'abc');
    expect(getBestScore()).toBe(0);
  });

  test('showNewBestScoreMessage debería mostrar el mensaje si el elemento existe', () => {
    showNewBestScoreMessage();
    expect(messageElement.style.display).toBe('block');
  });

  test('showNewBestScoreMessage no debería lanzar error si el elemento no existe', () => {
    document.body.innerHTML = '';
    expect(() => showNewBestScoreMessage()).not.toThrow();
  });

  test('showNewBestScoreMessage debería usar el elemento con id best-score-message como fallback', () => {
    document.body.innerHTML =
      '<div id="best-score-message" style="display: none;"></div>';
    showNewBestScoreMessage();
    const fallbackElement = document.getElementById('best-score-message');
    expect(fallbackElement.style.display).toBe('block');
  });

  test('showNewHighScoreMessage debería ser un alias de showNewBestScoreMessage', () => {
    expect(showNewHighScoreMessage).toBe(showNewBestScoreMessage);
  });

  test('showNewHighScoreMessage debería mostrar el mensaje', () => {
    showNewHighScoreMessage();
    expect(messageElement.style.display).toBe('block');
  });

  test('no debería llamar a showNewBestScoreMessage si no hay nueva mejor puntuación', () => {
    localStorage.setItem('bestScore', '200');
    endGame(150);
    expect(messageElement.style.display).toBe('none');
  });

  test('debería manejar puntuaciones negativas sin actualizar la mejor puntuación', () => {
    localStorage.setItem('bestScore', '100');
    const result = endGame(-10);
    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(result.isNewBestScore).toBe(false);
    expect(result.bestScore).toBe(100);
    expect(messageElement.style.display).toBe('none');
  });

  test('debería actualizar la mejor puntuación si no existe previa y la puntuación es negativa', () => {
    const result = endGame(-10);
    expect(localStorage.getItem('bestScore')).toBe('0');
    expect(result.isNewBestScore).toBe(true);
    expect(result.bestScore).toBe(0);
  });
});