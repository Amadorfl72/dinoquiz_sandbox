const { Telemetry } = require('../../analytics/telemetry');

describe('TRIOFSND-41: Telemetría de re-jugada', () => {
  let sendEventSpy;
  let emitMetricSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    sendEventSpy = jest.spyOn(Telemetry, '_sendEvent').mockImplementation(() => {});
    emitMetricSpy = jest.spyOn(Telemetry, '_emitMetric').mockImplementation(() => {});
  });

  describe('logReplayClicked', () => {
    it('debe emitir el evento replay_clicked con previous_score y timestamp', () => {
      const previousScore = 1500;
      Telemetry.logReplayClicked.call(Telemetry, previousScore);

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.name).toBe('replay_clicked');
      expect(event.previous_score).toBe(1500);
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('string');
    });

    it('debe emitir replay_clicked con previous_score igual a 0', () => {
      Telemetry.logReplayClicked.call(Telemetry, 0);
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.name).toBe('replay_clicked');
      expect(event.previous_score).toBe(0);
    });

    it('debe emitir replay_clicked con un previous_score negativo válido', () => {
      Telemetry.logReplayClicked.call(Telemetry, -50);
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.previous_score).toBe(-50);
    });

    it('debe permitir múltiples eventos replay_clicked', () => {
      Telemetry.logReplayClicked.call(Telemetry, 100);
      Telemetry.logReplayClicked.call(Telemetry, 200);
      Telemetry.logReplayClicked.call(Telemetry, 300);

      expect(sendEventSpy).toHaveBeenCalledTimes(3);
      sendEventSpy.mock.calls.forEach(call => {
        expect(call[0].name).toBe('replay_clicked');
      });
    });
  });

  describe('logGameStarted', () => {
    it('debe emitir el evento game_started con trigger replay', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.name).toBe('game_started');
      expect(event.trigger).toBe('replay');
    });

    it('el evento game_started con trigger replay debe incluir timestamp', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('string');
    });

    it('no debe emitir game_started con trigger distinto a replay si se pasa otro valor', () => {
      Telemetry.logGameStarted.call(Telemetry, 'new_game');
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.trigger).not.toBe('replay');
      expect(event.trigger).toBe('new_game');
    });
  });

  describe('Secuencia de eventos de re-jugada', () => {
    it('debe registrar replay_clicked seguido de game_started con trigger replay', () => {
      Telemetry.logReplayClicked.call(Telemetry, 1200);
      Telemetry.logGameStarted.call(Telemetry, 'replay');

      const events = sendEventSpy.mock.calls.map(c => c[0]);
      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('replay_clicked');
      expect(events[0].previous_score).toBe(1200);
      expect(events[1].name).toBe('game_started');
      expect(events[1].trigger).toBe('replay');
    });
  });

  describe('calculateReplayRate', () => {
    it('debe calcular la tasa de re-jugada correctamente', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.3333);
      const replayRate = Telemetry.calculateReplayRate.call(Telemetry);
      expect(replayRate).toBeCloseTo(0.3333, 5);
    });

    it('debe retornar 0 cuando no hay eventos game_started', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0);
      const replayRate = Telemetry.calculateReplayRate.call(Telemetry);
      expect(replayRate).toBe(0);
    });

    it('debe emitir la métrica con window_minutes igual a 5', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.5);
      Telemetry.calculateReplayRate.call(Telemetry);
      expect(emitMetricSpy).toHaveBeenCalledWith('replay_rate', 0.5, { window_minutes: 5 });
    });
  });
});
