import { calculateMetrics } from './metrics';

describe('calculateMetrics', () => {
  it('calculates success ratios per question', () => {
    const logs = [
      { event: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 },
      { event: 'question_answered', question_id: 'q1', success: false, time_to_answer_ms: 200 },
      { event: 'question_answered', question_id: 'q2', success: false, time_to_answer_ms: 300 },
    ];
    const metrics = calculateMetrics(logs);
    expect(metrics.successRatios.q1).toEqual({ correct: 1, total: 2 });
    expect(metrics.successRatios.q2).toEqual({ correct: 0, total: 1 });
  });

  it('calculates time distributions', () => {
    const logs = [
      { event: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 },
      { event: 'question_answered', question_id: 'q1', success: false, time_to_answer_ms: 200 },
      { event: 'feedback_shown', question_id: 'q1' },
    ];
    const metrics = calculateMetrics(logs);
    expect(metrics.timeDistributions).toEqual([100, 200]);
  });

  it('identifies top 5 worst performing questions', () => {
    const logs = [
      { event: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 },
      { event: 'question_answered', question_id: 'q2', success: false, time_to_answer_ms: 100 },
      { event: 'question_answered', question_id: 'q3', success: false, time_to_answer_ms: 100 },
      { event: 'question_answered', question_id: 'q4', success: false, time_to_answer_ms: 100 },
      { event: 'question_answered', question_id: 'q5', success: false, time_to_answer_ms: 100 },
      { event: 'question_answered', question_id: 'q6', success: false, time_to_answer_ms: 100 },
      { event: 'question_answered', question_id: 'q7', success: true, time_to_answer_ms: 100 },
    ];
    const metrics = calculateMetrics(logs);
    expect(metrics.worstQuestions).toHaveLength(5);
    const ids = metrics.worstQuestions.map(q => q.question_id);
    expect(ids).toContain('q2');
    expect(ids).toContain('q3');
    expect(ids).toContain('q4');
    expect(ids).toContain('q5');
    expect(ids).toContain('q6');
    expect(ids).not.toContain('q1');
    expect(ids).not.toContain('q7');
  });

  it('handles empty logs', () => {
    const metrics = calculateMetrics([]);
    expect(metrics.successRatios).toEqual({});
    expect(metrics.timeDistributions).toEqual([]);
    expect(metrics.worstQuestions).toEqual([]);
  });
});
