import { calculateMetrics } from './metrics';

describe('calculateMetrics', () => {
  it('calculates average success ratio per question', () => {
    const logs = [
      { event_type: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 },
      { event_type: 'question_answered', question_id: 'q1', success: false, time_to_answer_ms: 200 },
      { event_type: 'question_answered', question_id: 'q2', success: false, time_to_answer_ms: 300 },
    ];
    const metrics = calculateMetrics(logs);
    expect(metrics.successRatios.q1).toEqual(0.5);
    expect(metrics.successRatios.q2).toEqual(0);
  });

  it('calculates time to answer distribution', () => {
    const logs = [
      { event_type: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 },
      { event_type: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 200 },
      { event_type: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 300 },
    ];
    const metrics = calculateMetrics(logs);
    expect(metrics.timeDistributions).toEqual({
      min: 100,
      max: 300,
      avg: 200,
      count: 3,
    });
  });

  it('identifies top 5 worst performing questions', () => {
    const logs = [
      { event_type: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 },
      { event_type: 'question_answered', question_id: 'q2', success: false, time_to_answer_ms: 100 },
      { event_type: 'question_answered', question_id: 'q3', success: false, time_to_answer_ms: 100 },
      { event_type: 'question_answered', question_id: 'q4', success: false, time_to_answer_ms: 100 },
      { event_type: 'question_answered', question_id: 'q5', success: false, time_to_answer_ms: 100 },
      { event_type: 'question_answered', question_id: 'q6', success: false, time_to_answer_ms: 100 },
      { event_type: 'question_answered', question_id: 'q7', success: true, time_to_answer_ms: 100 },
    ];
    const metrics = calculateMetrics(logs);
    expect(metrics.worstQuestions.length).toBe(5);
    const worstIds = metrics.worstQuestions.map(q => q.question_id);
    expect(worstIds).toContain('q2');
    expect(worstIds).toContain('q3');
    expect(worstIds).toContain('q4');
    expect(worstIds).toContain('q5');
    expect(worstIds).toContain('q6');
  });

  it('returns empty metrics for empty logs', () => {
    const metrics = calculateMetrics([]);
    expect(metrics.successRatios).toEqual({});
    expect(metrics.timeDistributions).toEqual({});
    expect(metrics.worstQuestions).toEqual([]);
  });

  it('ignores feedback_shown events for metrics calculation', () => {
    const logs = [
      { event_type: 'feedback_shown', question_id: 'q1' },
      { event_type: 'question_answered', question_id: 'q1', success: true, time_to_answer_ms: 100 },
    ];
    const metrics = calculateMetrics(logs);
    expect(metrics.successRatios.q1).toEqual(1);
    expect(metrics.timeDistributions.count).toEqual(1);
  });
});
