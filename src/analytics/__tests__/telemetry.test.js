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
  });
});
