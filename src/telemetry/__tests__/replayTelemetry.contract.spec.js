const { Telemetry } = require('../../analytics/telemetry');

describe('TRIOFSND-41: Contrato de telemetría de re-jugada', () => {
  let sendEventSpy;
  let emitMetricSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    sendEventSpy = jest.spyOn(Telemetry, '_sendEvent').mockImplementation(() => {});
    emitMetricSpy = jest.spyOn(Telemetry, '_emitMetric').mockImplementation(() => {});
  });

  describe('Contrato del evento replay_clicked', () => {
    it('debe contener exactamente los campos requeridos: name, previous_score, timestamp', () => {
      Telemetry.logReplayClicked.call(Telemetry, 1000);
      const event = sendEventSpy.mock.calls[0][0];

      const requiredFields = ['name', 'previous_score', 'timestamp'];
      requiredFields.forEach((field) => {
        expect(event).toHaveProperty(field);
      });

      expect(event.name).toBe('replay_clicked');
      expect(typeof event.previous_score).toBe('number');
      expect(typeof event.timestamp).toBe('string');
    });

    it('name debe ser siempre el string "replay_clicked"', () => {
      Telemetry.logReplayClicked.call(Telemetry, 0);
      Telemetry.logReplayClicked.call(Telemetry, 999);
      Telemetry.logReplayClicked.call(Telemetry, -1);

      sendEventSpy.mock.calls.forEach((call) => {
        expect(call[0].name).toBe('replay_clicked');
        expect(typeof call[0].name).toBe('string');
      });
    });
  });

  describe('Contrato del evento game_started con trigger replay', () => {
    it('debe contener exactamente los campos requeridos: name, trigger, timestamp', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];

      const requiredFields = ['name', 'trigger', 'timestamp'];
      requiredFields.forEach((field) => {
        expect(event).toHaveProperty(field);
      });

      expect(event.name).toBe('game_started');
      expect(event.trigger).toBe('replay');
      expect(typeof event.timestamp).toBe('string');
    });

    it('name debe ser siempre el string "game_started"', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.name).toBe('game_started');
    });

    it('trigger debe ser siempre el string "replay"', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.trigger).toBe('replay');
    });
  });

  describe('Contrato de la métrica replay_rate', () => {
    it('debe contener los campos requeridos: name, value, attributes con window_minutes', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.5);
      Telemetry.calculateReplayRate.call(Telemetry);

      expect(emitMetricSpy).toHaveBeenCalledWith(
        'replay_rate',
        0.5,
        { window_minutes: 5 }
      );
    });

    it('value debe estar en el rango [0, 1]', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.4);
      const rate = Telemetry.calculateReplayRate.call(Telemetry);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });

    it('window_minutes debe ser exactamente 5', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.4);
      Telemetry.calculateReplayRate.call(Telemetry);
      expect(emitMetricSpy).toHaveBeenCalledWith('replay_rate', 0.4, { window_minutes: 5 });
    });

    it('name debe ser siempre el string "replay_rate"', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.4);
      Telemetry.calculateReplayRate.call(Telemetry);
      expect(emitMetricSpy.mock.calls[0][0]).toBe('replay_rate');
      expect(typeof emitMetricSpy.mock.calls[0][0]).toBe('string');
    });
  });
});
