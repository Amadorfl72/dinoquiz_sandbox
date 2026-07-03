import { Telemetry } from '../telemetry';

describe('TRIOFSND-41: Telemetry module', () => {
  let analyticsMock;

  beforeEach(() => {
    analyticsMock = {
      track: jest.fn(),
      metric: jest.fn()
    };
    global.window = { analytics: analyticsMock };
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    delete global.window;
    jest.restoreAllMocks();
  });

  describe('logReplayClicked', () => {
    it('debe enviar el evento replay_clicked con previous_score y timestamp', () => {
      Telemetry.logReplayClicked(500);
      
      expect(analyticsMock.track).toHaveBeenCalledTimes(1);
      const [eventName, payload] = analyticsMock.track.mock.calls[0];
      expect(eventName).toBe('replay_clicked');
      expect(payload.previous_score).toBe(500);
      expect(payload.timestamp).toBeDefined();
    });

    it('debe emitir un timestamp en formato ISO 8601', () => {
      Telemetry.logReplayClicked(100);
      
      const [, payload] = analyticsMock.track.mock.calls[0];
      expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('debe registrar el evento en consola', () => {
      Telemetry.logReplayClicked(250);
      
      expect(console.log).toHaveBeenCalledWith(
        'Telemetry event:',
        expect.objectContaining({ name: 'replay_clicked', previous_score: 250 })
      );
    });

    it('debe soportar previous_score de 0', () => {
      Telemetry.logReplayClicked(0);
      
      const [eventName, payload] = analyticsMock.track.mock.calls[0];
      expect(eventName).toBe('replay_clicked');
      expect(payload.previous_score).toBe(0);
    });

    it('no debe incluir el campo trigger en el payload', () => {
      Telemetry.logReplayClicked(500);
      
      const [, payload] = analyticsMock.track.mock.calls[0];
      expect(payload.trigger).toBeUndefined();
    });
  });

  describe('logGameStarted', () => {
    it('debe enviar el evento game_started con trigger y timestamp', () => {
      Telemetry.logGameStarted('replay');
      
      expect(analyticsMock.track).toHaveBeenCalledTimes(1);
      const [eventName, payload] = analyticsMock.track.mock.calls[0];
      expect(eventName).toBe('game_started');
      expect(payload.trigger).toBe('replay');
      expect(payload.timestamp).toBeDefined();
    });

    it('debe emitir un timestamp en formato ISO 8601', () => {
      Telemetry.logGameStarted('replay');
      
      const [, payload] = analyticsMock.track.mock.calls[0];
      expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('debe registrar el evento en consola', () => {
      Telemetry.logGameStarted('replay');
      
      expect(console.log).toHaveBeenCalledWith(
        'Telemetry event:',
        expect.objectContaining({ name: 'game_started', trigger: 'replay' })
      );
    });

    it('no debe incluir previous_score en el payload', () => {
      Telemetry.logGameStarted('replay');
      
      const [, payload] = analyticsMock.track.mock.calls[0];
      expect(payload.previous_score).toBeUndefined();
    });

    it('debe aceptar triggers distintos a replay', () => {
      Telemetry.logGameStarted('new_game');
      
      const [eventName, payload] = analyticsMock.track.mock.calls[0];
      expect(eventName).toBe('game_started');
      expect(payload.trigger).toBe('new_game');
    });
  });

  describe('calculateReplayRate', () => {
    it('debe emitir la métrica replay_rate con window_minutes 5', () => {
      const rate = Telemetry.calculateReplayRate();
      
      expect(analyticsMock.metric).toHaveBeenCalledTimes(1);
      const [metricName, value, attributes] = analyticsMock.metric.mock.calls[0];
      expect(metricName).toBe('replay_rate');
      expect(value).toBe(0.4);
      expect(attributes).toEqual({ window_minutes: 5 });
    });

    it('debe retornar el valor de la tasa de re-jugada', () => {
      const rate = Telemetry.calculateReplayRate();
      
      expect(typeof rate).toBe('number');
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });

    it('debe registrar la métrica en consola', () => {
      Telemetry.calculateReplayRate();
      
      expect(console.log).toHaveBeenCalledWith(
        'Telemetry metric:',
        'replay_rate',
        0.4,
        { window_minutes: 5 }
      );
    });

    it('debe usar una ventana de tiempo menor a 5 minutos', () => {
      const before = Date.now();
      Telemetry.calculateReplayRate();
      const after = Date.now();
      
      // La ejecución debe ser instantánea (ventana de cálculo < 5 min)
      expect(after - before).toBeLessThan(5000);
      
      const [, , attributes] = analyticsMock.metric.mock.calls[0];
      expect(attributes.window_minutes).toBeLessThanOrEqual(5);
    });
  });

  describe('_sendEvent', () => {
    it('no debe fallar si window.analytics no está definido', () => {
      delete global.window.analytics;
      
      expect(() => Telemetry._sendEvent({ name: 'test', timestamp: new Date().toISOString() })).not.toThrow();
    });
  });

  describe('_emitMetric', () => {
    it('no debe fallar si window.analytics no está definido', () => {
      delete global.window.analytics;
      
      expect(() => Telemetry._emitMetric('test_metric', 0.5, {})).not.toThrow();
    });
  });
});
