const { Telemetry } = require('../../analytics/telemetry');

describe('TRIOFSND-41: Contrato de telemetría de re-jugada', () => {
  let sendEventSpy;
  let emitMetricSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    sendEventSpy = jest.spyOn(Telemetry, '_sendEvent').mockImplementation(() => {});
    emitMetricSpy = jest.spyOn(Telemetry, '_emitMetric').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('previous_score debe preservar el valor numérico pasado', () => {
      Telemetry.logReplayClicked.call(Telemetry, 42);
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.previous_score).toBe(42);
      expect(typeof event.previous_score).toBe('number');
    });

    it('timestamp debe ser un string ISO 8601 parseable', () => {
      Telemetry.logReplayClicked.call(Telemetry, 100);
      const event = sendEventSpy.mock.calls[0][0];
      expect(new Date(event.timestamp).getTime()).not.toBeNaN();
    });

    it('el evento no debe incluir campos adicionales más allá de los requeridos', () => {
      Telemetry.logReplayClicked.call(Telemetry, 100);
      const event = sendEventSpy.mock.calls[0][0];
      expect(Object.keys(event).sort()).toEqual(['name', 'previous_score', 'timestamp']);
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

    it('trigger debe ser siempre el string "replay" cuando se invoca con replay', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.trigger).toBe('replay');
    });

    it('timestamp debe ser un string ISO 8601 parseable', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];
      expect(new Date(event.timestamp).getTime()).not.toBeNaN();
    });

    it('el evento no debe incluir campos adicionales más allá de los requeridos', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];
      expect(Object.keys(event).sort()).toEqual(['name', 'timestamp', 'trigger']);
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

    it('attributes debe contener únicamente window_minutes con valor 5', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.6);
      Telemetry.calculateReplayRate.call(Telemetry);
      const attributes = emitMetricSpy.mock.calls[0][2];
      expect(Object.keys(attributes)).toEqual(['window_minutes']);
      expect(attributes.window_minutes).toBe(5);
    });
  });
});
