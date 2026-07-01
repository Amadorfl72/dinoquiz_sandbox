import { getTop5WorstPerformingQuestions } from '../../src/analytics/questionMetrics.js';

describe('getTop5WorstPerformingQuestions', () => {
  it('should return the top 5 worst performing questions', async () => {
    const mockQuestions = [
      { questionId: '1', accuracy: 0.2 },
      { questionId: '2', accuracy: 0.3 },
      { questionId: '3', accuracy: 0.4 },
      { questionId: '4', accuracy: 0.5 },
      { questionId: '5', accuracy: 0.6 }
    ];

    jest.spyOn(db.collection('analytics'), 'aggregate').mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValueOnce(mockQuestions)
    });

    const result = await getTop5WorstPerformingQuestions();

    expect(result).toHaveLength(5);
    expect(result[0].accuracy).toBeLessThanOrEqual(result[1].accuracy);
    expect(result[1].accuracy).toBeLessThanOrEqual(result[2].accuracy);
    expect(result[2].accuracy).toBeLessThanOrEqual(result[3].accuracy);
    expect(result[3].accuracy).toBeLessThanOrEqual(result[4].accuracy);
  });
});