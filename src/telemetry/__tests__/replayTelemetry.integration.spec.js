const { Telemetry } = require('../../analytics/telemetry');
const { GameManager } = require('../../game/GameManager');
const ReplayButton = require('../../components/ReplayButton').default;

describe('TRIOFSND-41: Integración de telemetría de re-jugada', () => {
  let sendEventSpy;
  let emitMetricSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    sendEventSpy = jest.spyOn(Telemetry, '_sendEvent').mockImplementation(() => {});
    emitMetricSpy = jest.spyOn(Telemetry, '_emitMetric').mockImplementation(() => {});
  });

  describe('Flujo completo de re-jugada', () => {
    it('debe registrar el flujo: juego terminado -> replay_clicked -> game_started(replay)', () => {
      const previousScore = 2000;

      // Simular clic en botón de re-jugar
      const onClickMock = jest.fn();
      const element = ReplayButton({ score: previousScore, onClick: onClickMock });
      element.props.onClick();

      // Simular inicio de juego por replay
      const gm = new GameManager();
      gm.replayGame();

      const events = sendEventSpy.mock.calls.map(c => c[0]);
      expect(events).toHaveLength(2);

      // Validar replay_clicked
      expect(events[0].name).toBe('replay_clicked');
      expect(events[0].previous_score).toBe(2000);
      expect(events[0].timestamp).toBeDefined();

      // Validar game_started
      expect(events[1].name).toBe('game_started');
      expect(events[1].trigger).toBe('replay');
      expect(events[1].timestamp).toBeDefined();
      
      expect(onClickMock).toHaveBeenCalled();
    });

    it('debe calcular y emitir la métrica de tasa de re-jugada', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.4);
      const replayRate = Telemetry.calculateReplayRate.call(Telemetry);

      expect(replayRate).toBe(0.4);
      expect(emitMetricSpy).toHaveBeenCalledWith('replay_rate', 0.4, { window_minutes: 5 });
    });
  });
});
