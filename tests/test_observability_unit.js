const observability = require('../observability');
const logger = require('../logger');

jest.mock('../logger');

describe('Observability Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    observability.resetMetrics();
  });

  test('should log partida_iniciada with timestamp and 10 ids', () => {
    const timestamp = new Date().toISOString();
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    observability.logPartidaIniciada(timestamp, ids);
    
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('partida_iniciada'),
      expect.objectContaining({
        timestamp,
        ids
      })
    );
  });

  test('should log pregunta_respondida with id, hit, and time', () => {
    const id = 5;
    const hit = true;
    const time = 4.5;
    
    observability.logPreguntaRespondida(id, hit, time);
    
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('pregunta_respondida'),
      expect.objectContaining({
        id,
        hit,
        time
      })
    );
  });

  test('should log bank load validation', () => {
    const status = 'success';
    const details = 'Bank loaded successfully';
    
    observability.logBankLoadValidation(status, details);
    
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('bank_load_validation'),
      expect.objectContaining({
        status,
        details
      })
    );
  });
});

describe('Observability Metrics and Alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    observability.resetMetrics();
  });

  test('should calculate % hit per question correctly', () => {
    observability.recordQuestionMetric(1, true);
    observability.recordQuestionMetric(1, true);
    observability.recordQuestionMetric(1, false);
    
    const hitRate = observability.getHitRate(1);
    expect(hitRate).toBeCloseTo(66.66, 1);
  });

  test('should calculate drop-off per question correctly', () => {
    observability.recordDropOff(1, 100, 4);
    
    const dropOffRate = observability.getDropOffRate(1);
    expect(dropOffRate).toBe(4.0);
  });

  test('should trigger alert for >5% drop-off', () => {
    observability.recordDropOff(1, 100, 6); // 6% drop-off
    
    const alerts = observability.checkAlerts();
    expect(alerts).toContainEqual(
      expect.objectContaining({
        type: 'high_drop_off',
        questionId: 1,
        value: 6.0
      })
    );
  });

  test('should trigger alert for <40% hit rate', () => {
    observability.recordQuestionMetric(2, true);
    observability.recordQuestionMetric(2, false);
    observability.recordQuestionMetric(2, false);
    observability.recordQuestionMetric(2, false); // 25% hit rate
    
    const alerts = observability.checkAlerts();
    expect(alerts).toContainEqual(
      expect.objectContaining({
        type: 'low_hit_rate',
        questionId: 2,
        value: 25.0
      })
    );
  });

  test('should not trigger alerts when metrics are within thresholds', () => {
    observability.recordQuestionMetric(3, true);
    observability.recordQuestionMetric(3, true);
    observability.recordQuestionMetric(3, false); // 66% hit rate
    observability.recordDropOff(3, 100, 2); // 2% drop-off
    
    const alerts = observability.checkAlerts();
    expect(alerts).toHaveLength(0);
  });
});
