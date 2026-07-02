import { GameManager } from '../GameManager';
import { Telemetry } from '../analytics/telemetry';

describe('TRIOFSND-41: GameManager telemetría de re-jugada', () => {
  let logGameStartedSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    logGameStartedSpy = jest.spyOn(Telemetry, 'logGameStarted').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('startGame', () => {
    it('debe registrar el evento game_started con el trigger proporcionado', () => {
      const manager = new GameManager();
      manager.startGame('new_game');

      expect(logGameStartedSpy).toHaveBeenCalledTimes(1);
      expect(logGameStartedSpy).toHaveBeenCalledWith('new_game');
    });

    it('debe registrar game_started con trigger "replay" cuando se pasa "replay"', () => {
      const manager = new GameManager();
      manager.startGame('replay');

      expect(logGameStartedSpy).toHaveBeenCalledWith('replay');
    });

    it('debe aceptar cualquier string como trigger', () => {
      const manager = new GameManager();
      manager.startGame('resume');

      expect(logGameStartedSpy).toHaveBeenCalledWith('resume');
    });
  });

  describe('replayGame', () => {
    it('debe iniciar el juego con trigger "replay"', () => {
      const manager = new GameManager();
      manager.replayGame();

      expect(logGameStartedSpy).toHaveBeenCalledTimes(1);
      expect(logGameStartedSpy).toHaveBeenCalledWith('replay');
    });

    it('debe llamar a startGame internamente con "replay"', () => {
      const manager = new GameManager();
      const startGameSpy = jest.spyOn(manager, 'startGame');

      manager.replayGame();

      expect(startGameSpy).toHaveBeenCalledWith('replay');
    });

    it('no debe registrar el evento más de una vez por llamada', () => {
      const manager = new GameManager();
      manager.replayGame();

      expect(logGameStartedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('endGame', () => {
    it('debe existir el método endGame', () => {
      const manager = new GameManager();
      expect(typeof manager.endGame).toBe('function');
    });

    it('no debe registrar telemetría al finalizar el juego', () => {
      const manager = new GameManager();
      manager.endGame();

      expect(logGameStartedSpy).not.toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('debe inicializar currentScore en 0', () => {
      const manager = new GameManager();
      expect(manager.currentScore).toBe(0);
    });

    it('debe crear una instancia independiente cada vez', () => {
      const manager1 = new GameManager();
      const manager2 = new GameManager();
      manager1.currentScore = 500;

      expect(manager2.currentScore).toBe(0);
    });
  });
});
