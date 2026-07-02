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
  });

  describe('constructor', () => {
    it('debe inicializar currentScore en 0', () => {
      const manager = new GameManager();
      expect(manager.currentScore).toBe(0);
    });
  });
});
