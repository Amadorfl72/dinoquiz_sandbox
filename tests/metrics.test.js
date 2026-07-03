jest.mock('firebase/app');
jest.mock('firebase/performance');
jest.mock('firebase/functions');

const { getFunctions, httpsCallable } = require('firebase/functions');
const alertRules = require('../src/utils/alertRules.json');
const Metrics = require('../src/utils/metrics').default;

describe('Metrics', () => {
  let sendAlertMock;

  beforeEach(() => {
    jest.clearAllMocks();
    sendAlertMock = jest.fn().mockResolvedValue({});
    httpsCallable.mockReturnValue(sendAlertMock);
  });

  describe('trackQuestionPerformance', () => {
    it('tracks hits and attempts and computes hit rate', () => {
      // Use bind to preserve `this` context
      const track = Metrics.trackQuestionPerformance.bind(Metrics);

      track('q1', true);
      track('q1', true);
      track('q1', false);

      // 2/3 = 66.67% hit rate, above 40% threshold, no alert
      expect(sendAlertMock).not.toHaveBeenCalled();
    });

    it('triggers low_hit_rate alert when hit rate falls below 40%', () => {
      const track = Metrics.trackQuestionPerformance.bind(Metrics);

      track('q2', false);
      track('q2', false);
      track('q2', false);
      track('q2', false);
      track('q2', false);

      // 0/5 = 0% hit rate, below 40%
      expect(sendAlertMock).toHaveBeenCalled();
      const callArgs = sendAlertMock.mock.calls[0][0];
      expect(callArgs.type).toBe('low_hit_rate');
      expect(callArgs.data.question_id).toBe('q2');
      expect(callArgs.data.hit_rate).toBeLessThan(40);
    });

    it('includes alert config from alertRules.json', () => {
      const track = Metrics.trackQuestionPerformance.bind(Metrics);

      track('q3', false);
      track('q3', false);

      const callArgs = sendAlertMock.mock.calls[0][0];
      const expectedConfig = alertRules.alerts.find(a => a.name === 'low_hit_rate');
      expect(callArgs.config).toEqual(expectedConfig);
    });
  });

  describe('trackDropOffRate', () => {
    it('tracks views and drop-offs and computes drop-off rate', () => {
      const track = Metrics.trackDropOffRate.bind(Metrics);

      track('q4', false);
      track('q4', false);
      track('q4', false);

      // 0/3 = 0% drop-off, below 5%, no alert
      expect(sendAlertMock).not.toHaveBeenCalled();
    });

    it('triggers high_drop_off alert when drop-off rate exceeds 5%', () => {
      const track = Metrics.trackDropOffRate.bind(Metrics);

      // 1/6 ≈ 16.67% drop-off, above 5%
      track('q5', true);
      track('q5', false);
      track('q5', false);
      track('q5', false);
      track('q5', false);
      track('q5', false);

      expect(sendAlertMock).toHaveBeenCalled();
      const callArgs = sendAlertMock.mock.calls[0][0];
      expect(callArgs.type).toBe('high_drop_off');
      expect(callArgs.data.question_id).toBe('q5');
      expect(callArgs.data.drop_off_rate).toBeGreaterThan(5);
    });

    it('includes alert config from alertRules.json for high_drop_off', () => {
      const track = Metrics.trackDropOffRate.bind(Metrics);

      track('q6', true);
      track('q6', true);

      const callArgs = sendAlertMock.mock.calls[0][0];
      const expectedConfig = alertRules.alerts.find(a => a.name === 'high_drop_off');
      expect(callArgs.config).toEqual(expectedConfig);
    });
  });

  describe('triggerAlert', () => {
    it('does nothing if alert type is not found in rules', () => {
      Metrics.triggerAlert.bind(Metrics)('nonexistent_alert', {});
      expect(sendAlertMock).not.toHaveBeenCalled();
    });

    it('calls httpsCallable sendAlert with type, config, and data', () => {
      Metrics.triggerAlert.bind(Metrics)('low_hit_rate', {
        question_id: 'q7',
        hit_rate: 30
      });

      expect(httpsCallable).toHaveBeenCalled();
      expect(sendAlertMock).toHaveBeenCalledTimes(1);
      const callArgs = sendAlertMock.mock.calls[0][0];
      expect(callArgs.type).toBe('low_hit_rate');
      expect(callArgs.data).toEqual({ question_id: 'q7', hit_rate: 30 });
    });
  });

  describe('setupAlerts', () => {
    it('sets up a periodic interval', () => {
      jest.useFakeTimers();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      Metrics.setupAlerts.bind(Metrics)();

      expect(setIntervalSpy).toHaveBeenCalled();
      const intervalTime = setIntervalSpy.mock.calls[0][1];
      expect(intervalTime).toBe(300000);

      setIntervalSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
