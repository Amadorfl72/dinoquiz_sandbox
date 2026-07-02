const {
  emitReplayClicked,
  emitGameStartedReplay,
  calculateReplayRate,
  resetTelemetryState,
  getEmittedEvents,
  getEmittedMetrics,
} = require('../replayTelemetry');

describe('TRIOFSND-41: Integración de telemetría de re-jugada', () => {
  beforeEach(() => {
    resetTelemetryState();
  });

  describe('Flujo completo de re-jugada', () => {
    it('debe registrar el flujo: juego terminado -> replay_clicked -> game_started(replay)', () => {
      // 1. Usuario termina el juego con score 2000
      const previousScore = 2000;

      // 2. Usuario hace clic en re-jugar
      emitReplayClicked(previousScore);

      // 3. Se inicia el nuevo juego por replay
      emitGameStartedReplay();

      const events = getEmittedEvents();
      expect(events).toHaveLength(2);

      // Validar replay_clicked
      expect(events[0].event_name).toBe('replay_clicked');
      expect(events[0].previous_score).toBe(2000);
      expect(events[0].timestamp).toBeGreaterThan(0);

      // Validar game_started
      expect(events[1].event_name).toBe('game_started');
      expect(events[1].trigger).toBe('replay');
      expect(events[1].timestamp).toBeGreaterThanOrEqual(events[0].timestamp);
    });

    it('debe calcular y emitir la métrica de tasa de re-jugada tras múltiples re-jugadas', () => {
      // Simular 3 sesiones nuevas y 2 re-jugadas
      for (let i = 0; i < 3; i++) {
        getEmittedEvents().push({
          event_name: 'game_started',
          trigger: 'new_game',
          timestamp: Date.now(),
        });
      }

      emitReplayClicked(500);
      emitGameStartedReplay();

      emitReplayClicked(800);
      emitGameStartedReplay();

      const replayRate = calculateReplayRate();

      // 2 replays / 5 total = 0.4
      expect(replayRate).toBeCloseTo(0.4, 5);

      const metrics = getEmittedMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metric_name).toBe('replay_rate');
      expect(metrics[0].value).toBeCloseTo(0.4, 5);
      expect(metrics[0].window_minutes).toBe(5);
    });

    it('debe mantener la consistencia de eventos bajo carga', () => {
      for (let i = 0; i < 50; i++) {
        emitReplayClicked(i * 100);
        emitGameStartedReplay();
      }

      const events = getEmittedEvents();
      expect(events).toHaveLength(100);

      const replayClickedEvents = events.filter(
        (e) => e.event_name === 'replay_clicked'
      );
      const gameStartedReplayEvents = events.filter(
        (e) => e.event_name === 'game_started' && e.trigger === 'replay'
      );

      expect(replayClickedEvents).toHaveLength(50);
      expect(gameStartedReplayEvents).toHaveLength(50);

      // Todos los replay_clicked deben tener previous_score y timestamp
      replayClickedEvents.forEach((e, idx) => {
        expect(e.previous_score).toBe(idx * 100);
        expect(e.timestamp).toBeGreaterThan(0);
      });

      // Todos los game_started deben tener trigger replay y timestamp
      gameStartedReplayEvents.forEach((e) => {
        expect(e.trigger).toBe('replay');
        expect(e.timestamp).toBeGreaterThan(0);
      });

      const replayRate = calculateReplayRate();
      expect(replayRate).toBe(1); // Todos son replays
    });
  });

  describe('Validación de ventana temporal en escenario realista', () => {
    it('debe calcular la tasa solo con eventos recientes en un escenario mixto', () => {
      const now = Date.now();

      // Hace 8 minutos: 2 juegos nuevos, 1 replay (fuera de ventana)
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: now - 8 * 60 * 1000,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: now - 8 * 60 * 1000,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'replay',
        timestamp: now - 8 * 60 * 1000,
      });

      // Hace 2 minutos: 3 juegos nuevos, 2 replays (dentro de ventana)
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: now - 2 * 60 * 1000,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: now - 2 * 60 * 1000,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: now - 2 * 60 * 1000,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'replay',
        timestamp: now - 2 * 60 * 1000,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'replay',
        timestamp: now - 1 * 60 * 1000,
      });

      const replayRate = calculateReplayRate();

      // Ventana 5 min: 2 replays / 5 total = 0.4
      expect(replayRate).toBeCloseTo(0.4, 5);

      const metric = getEmittedMetrics()[0];
      expect(metric.metric_name).toBe('replay_rate');
      expect(metric.value).toBeCloseTo(0.4, 5);
      expect(metric.window_minutes).toBe(5);
    });
  });
});
