import { getTop5WorstPerformingQuestions } from '../../src/analytics/questionMetrics.js';

describe('getTop5WorstPerformingQuestions', () => {
  it('should return exactly 5 questions when available', async () => {
    const mockQuestions = [
      { questionId: '1', accuracy: 0.6, totalAttempts: 25 },
      { questionId: '2', accuracy: 0.5, totalAttempts: 18 },
      { questionId: '3', accuracy: 0.4, totalAttempts: 20 },
      { questionId: '4', accuracy: 0.3, totalAttempts: 12 },
      { questionId: '5', accuracy: 0.2, totalAttempts: 15 }
    ];

    jest.spyOn(db.collection('analytics'), 'aggregate').mockImplementation((pipeline) => {
      // Verify pipeline has $limit:5
      const limitStage = pipeline.find(stage => '$limit' in stage);
      expect(limitStage).toBeDefined();
      expect(limitStage.$limit).toBe(5);
      
      // Verify pipeline has $sort
      const sortStage = pipeline.find(stage => '$sort' in stage);
      expect(sortStage).toBeDefined();
      
      return {
        toArray: jest.fn().mockResolvedValueOnce(mockQuestions)
      };
    });

    const result = await getTop5WorstPerformingQuestions();

    expect(result).toHaveLength(5);
    expect(result[0].accuracy).toBeLessThanOrEqual(result[1].accuracy);
    expect(result[1].accuracy).toBeLessThanOrEqual(result[2].accuracy);
    expect(result[2].accuracy).toBeLessThanOrEqual(result[3].accuracy);
    expect(result[3].accuracy).toBeLessThanOrEqual(result[4].accuracy);
    
    result.forEach(question => {
      expect(question.totalAttempts).toBeGreaterThanOrEqual(10);
    });
  });

  it('should return fewer than 5 questions if insufficient data exists', async () => {
    const mockQuestions = [
      { questionId: '1', accuracy: 0.2, totalAttempts: 15 },
      { questionId: '2', accuracy: 0.3, totalAttempts: 8 },
      { questionId: '3', accuracy: 0.4, totalAttempts: 20 }
    ];

    jest.spyOn(db.collection('analytics'), 'aggregate').mockImplementation((pipeline) => {
      const filtered = mockQuestions.filter(q => q.totalAttempts >= 10);
      return {
        toArray: jest.fn().mockResolvedValueOnce(filtered)
      };
    });

    const result = await getTop5WorstPerformingQuestions();
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.length).toBeGreaterThan(0);
  });
});