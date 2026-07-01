const { selectRandomQuestions } = require('./gameUtils');

describe('selectRandomQuestions', () => {
  const mockPool = Array.from({ length: 30 }, (_, i) => ({ id: i, question: `Question ${i}` }));

  it('should return an array of 10 questions', () => {
    const result = selectRandomQuestions(mockPool, 10);
    expect(result).toHaveLength(10);
  });

  it('should not contain duplicate questions', () => {
    const result = selectRandomQuestions(mockPool, 10);
    const ids = result.map(q => q.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('should return a different set of questions on subsequent calls (randomness)', () => {
    const result1 = selectRandomQuestions(mockPool, 10);
    const result2 = selectRandomQuestions(mockPool, 10);
    // It's highly unlikely two random sets of 10 from 30 are identical
    const isSame = result1.every(q1 => result2.some(q2 => q1.id === q2.id));
    expect(isSame).toBe(false);
  });
});