import { finalizeGame, getBestScore, setBestScore, isNewBestScore } from './bestScore';

describe('TRIOFSND-40 - Actualizar mejor puntuación en localStorage', () => {
  const STORAGE_KEY = 'triofsnd_best_score';
  const NEW_BEST_MESSAGE_ID = 'new-best-score-message';

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="${NEW_BEST_MESSAGE_ID}" style="display:none;"></div>
      <span id="best-score-display"></span>
    `;
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  describe('getBestScore', () => {
    it('debería devolver 0 cuando no hay puntuación guardada en localStorage', () => {
      expect(getBestScore()).toBe(0);
    });

    it('debería devolver el valor numérico guardado en localStorage', () => {
      localStorage.setItem(STORAGE_KEY, '1500');
      expect(getBestScore()).toBe(1500);
    });

    it('debería devolver 0 si el valor guardado no es numérico', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid');
      expect(getBestScore()).toBe(0);
    });

    it('debería devolver 0 si el valor guardado es negativo', () => {
      localStorage.setItem(STORAGE_KEY, '-100');
      expect(getBestScore()).toBe(0);
    });
  });

  describe('setBestScore', () => {
    it('debería guardar la puntuación en localStorage', () => {
      setBestScore(2000);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('2000');
    });

    it('debería sobrescribir una puntuación existente', () => {
      localStorage.setItem(STORAGE_KEY, '500');
      setBestScore(1000);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('1000');
    });
  });

  describe('isNewBestScore', () => {
    it('debería devolver true si la puntuación actual es mayor que la guardada', () => {
      localStorage.setItem(STORAGE_KEY, '1000');
      expect(isNewBestScore(1500)).toBe(true);
    });

    it('debería devolver true si no hay puntuación guardada y la actual es mayor que 0', () => {
      expect(isNewBestScore(500)).toBe(true);
    });

    it('debería devolver false si la puntuación actual es menor que la guardada', () => {
      localStorage.setItem(STORAGE_KEY, '1000');
      expect(isNewBestScore(500)).toBe(false);
    });

    it('debería devolver false si la puntuación actual es igual a la guardada', () => {
      localStorage.setItem(STORAGE_KEY, '1000');
      expect(isNewBestScore(1000)).toBe(false);
    });

    it('debería devolver false si la puntuación actual es 0', () => {
      expect(isNewBestScore(0)).toBe(false);
    });

    it('debería devolver false si la puntuación actual es negativa', () => {
      localStorage.setItem(STORAGE_KEY, '100');
      expect(isNewBestScore(-50)).toBe(false);
    });
  });

  describe('finalizeGame', () => {
    it('debería actualizar localStorage cuando la puntuación actual es mayor', () => {
      localStorage.setItem(STORAGE_KEY, '1000');
      finalizeGame(2000);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('2000');
    });

    it('debería mostrar el mensaje de nueva mejor puntuación cuando la puntuación actual es mayor', () => {
      localStorage.setItem(STORAGE_KEY, '1000');
      finalizeGame(2000);
      const message = document.getElementById(NEW_BEST_MESSAGE_ID);
      expect(message.style.display).not.toBe('none');
      expect(message.classList.contains('visible')).toBe(true);
    });

    it('debería actualizar el display de mejor puntuación con el nuevo valor', () => {
      localStorage.setItem(STORAGE_KEY, '1000');
      finalizeGame(2000);
      const display = document.getElementById('best-score-display');
      expect(display.textContent).toBe('2000');
    });

    it('no debería actualizar localStorage cuando la puntuación actual es menor', () => {
      localStorage.setItem(STORAGE_KEY, '2000');
      finalizeGame(1000);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('2000');
    });

    it('no debería mostrar el mensaje de nueva mejor puntuación cuando la puntuación actual es menor', () => {
      localStorage.setItem(STORAGE_KEY, '2000');
      finalizeGame(1000);
      const message = document.getElementById(NEW_BEST_MESSAGE_ID);
      expect(message.style.display).toBe('none');
      expect(message.classList.contains('visible')).toBe(false);
    });

    it('no debería mostrar el mensaje cuando la puntuación actual es igual a la guardada', () => {
      localStorage.setItem(STORAGE_KEY, '1500');
      finalizeGame(1500);
      const message = document.getElementById(NEW_BEST_MESSAGE_ID);
      expect(message.style.display).toBe('none');
      expect(message.classList.contains('visible')).toBe(false);
    });

    it('no debería actualizar localStorage cuando la puntuación actual es igual a la guardada', () => {
      localStorage.setItem(STORAGE_KEY, '1500');
      finalizeGame(1500);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('1500');
    });

    it('debería guardar y mostrar mensaje cuando no hay puntuación previa y la actual es mayor que 0', () => {
      finalizeGame(500);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('500');
      const message = document.getElementById(NEW_BEST_MESSAGE_ID);
      expect(message.style.display).not.toBe('none');
      expect(message.classList.contains('visible')).toBe(true);
    });

    it('no debería guardar ni mostrar mensaje cuando no hay puntuación previa y la actual es 0', () => {
      finalizeGame(0);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      const message = document.getElementById(NEW_BEST_MESSAGE_ID);
      expect(message.style.display).toBe('none');
    });

    it('debería manejar correctamente la primera partida con puntuación alta', () => {
      finalizeGame(9999);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('9999');
      const display = document.getElementById('best-score-display');
      expect(display.textContent).toBe('9999');
      const message = document.getElementById(NEW_BEST_MESSAGE_ID);
      expect(message.classList.contains('visible')).toBe(true);
    });

    it('debería ocultar el mensaje antes de evaluar si hay nueva mejor puntuación', () => {
      localStorage.setItem(STORAGE_KEY, '100');
      const message = document.getElementById(NEW_BEST_MESSAGE_ID);
      message.classList.add('visible');
      message.style.display = 'block';

      finalizeGame(50);

      expect(message.style.display).toBe('none');
      expect(message.classList.contains('visible')).toBe(false);
    });

    it('debería actualizar localStorage con puntuaciones consecutivamente crecientes', () => {
      finalizeGame(100);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('100');

      finalizeGame(200);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('200');

      finalizeGame(300);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('300');
    });

    it('no debería actualizar localStorage con puntuaciones consecutivamente decrecientes', () => {
      finalizeGame(300);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('300');

      finalizeGame(200);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('300');

      finalizeGame(100);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('300');
    });
  });
});
