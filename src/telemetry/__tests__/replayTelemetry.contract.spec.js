const {
  emitReplayClicked,
  emitGameStartedReplay,
  calculateReplayRate,
  resetTelemetryState,
  getEmittedEvents,
  getEmittedMetrics,
} = require('../replayTelemetry');

describe('TRIOFSND-41: Contrato de telemetría de re-jugada', () => {
  beforeEach(() => {
    resetTelemetryState();
  });

  describe('Contrato del evento replay_clicked', () => {
    it('debe contener exactamente los campos requeridos: event_name, previous_score, timestamp', () => {
      emitReplayClicked(1000);
      const event = getEmittedEvents()[0];

      const requiredFields = ['event_name', 'previous_score', 'timestamp'];
      requiredFields.forEach((field) => {
        expect(event).toHaveProperty(field);
      });

      expect(event.event_name).toBe('replay_clicked');
      expect(typeof event.previous_score).toBe('number');
      expect(typeof event.timestamp).toBe('number');
    });

    it('event_name debe ser siempre el string "replay_clicked"', () => {
      emitReplayClicked(0);
      emitReplayClicked(999);
      emitReplayClicked(-1);

      const events = getEmittedEvents();
      events.forEach((e) => {
        expect(e.event_name).toBe('replay_clicked');
        expect(typeof e.event_name).toBe('string');
      });
    });
  });

  describe('Contrato del evento game_started con trigger replay', () => {
    it('debe contener exactamente los campos requeridos: event_name, trigger, timestamp', () => {
      emitGameStartedReplay();
      const event = getEmittedEvents()[0];

      const requiredFields = ['event_name', 'trigger', 'timestamp'];
      requiredFields.forEach((field) => {
        expect(event).toHaveProperty(field);
      });

      expect(event.event_name).toBe('game_started');
      expect(event.trigger).toBe('replay');
      expect(typeof event.timestamp).toBe('number');
    });

    it('event_name debe ser siempre el string "game_started"', () => {
      emitGameStartedReplay();
      const event = getEmittedEvents()[0];
      expect(event.event_name).toBe('game_started');
    });

    it('trigger debe ser siempre el string "replay"', () => {
      emitGameStartedReplay();
      const event = getEmittedEvents()[0];
      expect(event.trigger).toBe('replay');
    });
  });

  describe('Contrato de la métrica replay_rate', () => {
    it('debe contener los campos requeridos: metric_name, value, timestamp, window_minutes', () => {
      emitGameStartedReplay();
      calculateReplayRate();

      const metric = getEmittedMetrics()[0];
      const requiredFields = [
        'metric_name',
        'value',
        'timestamp',
        'window_minutes',
      ];
      requiredFields.forEach((field) => {
        expect(metric).toHaveProperty(field);
      });

      expect(metric.metric_name).toBe('replay_rate');
      expect(typeof metric.value).toBe('number');
      expect(typeof metric.timestamp).toBe('number');
      expect(typeof metric.window_minutes).toBe('number');
    });

    it('value debe estar en el rango [0, 1]', () => {
      emitGameStartedReplay();
      calculateReplayRate();

      const metric = getEmittedMetrics()[0];
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.value).toBeLessThanOrEqual(1);
    });

    it('window_minutes debe ser exactamente 5', () => {
      emitGameStartedReplay();
      calculateReplayRate();

      const metric = getEmittedMetrics()[0];
      expect(metric.window_minutes).toBe(5);
    });

    it('metric_name debe ser siempre el string "replay_rate"', () => {
      emitGameStartedReplay();
      calculateReplayRate();

      const metric = getEmittedMetrics()[0];
      expect(metric.metric_name).toBe('replay_rate');
      expect(typeof metric.metric_name).toBe('string');
    });
  });
});
