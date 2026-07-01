import { aggregateTimeToAnswerMetrics } from '../../../src/analytics/metrics/timeToAnswerMetrics';

describe('aggregateTimeToAnswerMetrics', () => {
  it('correctly aggregates time to answer metrics into histogram buckets', () => {
    const mockEvents = [
      { time_to_answer_ms: 500 },
      { time_to_answer_ms: 1500 },
      { time_to_answer_ms: 2000 },
      { time_to_answer_ms: 3500 },
      { time_to_answer_ms: 7000 },
      { time_to_answer_ms: 12000 }
    ];

    const result = aggregateTimeToAnswerMetrics(mockEvents);

    expect(result.histogram).toEqual({
      '0-1s': 1,
      '1-3s': 2,
      '3-5s': 1,
      '5-10s': 1,
      '10s+': 1
    });
  });

  it('handles empty events array', () => {
    const result = aggregateTimeToAnswerMetrics([]);
    expect(result.histogram).toEqual({
      '0-1s': 0,
      '1-3s': 0,
      '3-5s': 0,
      '5-10s': 0,
      '10s+': 0
    });
  });

  it('handles null/undefined events', () => {
    const result = aggregateTimeToAnswerMetrics(null);
    expect(result.histogram).toEqual({
      '0-1s': 0,
      '1-3s': 0,
      '3-5s': 0,
      '5-10s': 0,
      '10s+': 0
    });
  });

  it('filters out events without time_to_answer_ms', () => {
    const mockEvents = [
      {},
      { time_to_answer_ms: 1500 },
      { wrong_field: 2000 }
    ];

    const result = aggregateTimeToAnswerMetrics(mockEvents);
    expect(result.histogram['1-3s']).toBe(1);
  });
});