import AnalyticsDashboard from './dashboard';

describe('AnalyticsDashboard', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('initializes with metrics calculated from logs', () => {
    const logs = [
      { event: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 }
    ];
    const dashboard = new AnalyticsDashboard(logs);
    expect(dashboard.metrics).toBeDefined();
    expect(dashboard.metrics.successRatios.q1).toEqual({ correct: 1, total: 1 });
  });

  it('displays metrics to console', () => {
    const logs = [
      { event: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 }
    ];
    const dashboard = new AnalyticsDashboard(logs);
    dashboard.displayMetrics();
    expect(consoleSpy).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith('Average Success Ratio per Question:', dashboard.metrics.successRatios);
    expect(consoleSpy).toHaveBeenCalledWith('Time to Answer Distribution:', dashboard.metrics.timeDistributions);
    expect(consoleSpy).toHaveBeenCalledWith('Top 5 Worst Performing Questions:', dashboard.metrics.worstQuestions);
  });
});
