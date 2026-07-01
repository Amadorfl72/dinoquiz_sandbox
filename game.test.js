const { initializeGame } = require('./game');

describe('TRIOFSND-9: Game Initialization Logic',() => {
  let mockQuestionPool;

  beforeEach(() => {
    mockQuestionPool = Array.from({ length: 30 }, (_, i) => ({
      id: `q${i + 1}`,
      text: `Question ${i + 1}`,
      options: [`A${i + 1}`, `B${i + 1}`, `C${i + 1}`],
      correctAnswer: `A${i + 1}`
    }));
  });

  it('should return exactly 10 questions', () => {
    const result = initializeGame(mockQuestionPool);
    expect(result).toHaveLength(10);
  });

  it('should not contain duplicate questions', () => {
    const result = initializeGame(mockQuestionPool);
    const ids = result.map(q => q.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('should shuffle the answer options for each question', () => {
    const result = initializeGame(mockQuestionPool);
    result.forEach(q => {
      const original = mockQuestionPool.find(o => o.id === q.id);
      expect(q.options.sort()).toEqual(original.options.sort());
      expect(q.options).toHaveLength(3);
    });
  });

  it('should produce a shuffled order of options at least once over multiple runs', () => {
    let isShuffled = false;
    for (let i = 0; i < 50; i++) {
      const result = initializeGame(mockQuestionPool);
      for (const q of result) {
        const original = mockQuestionPool.find(o => o.id === q.id);
        if (JSON.stringify(q.options) !== JSON.stringify(original.options)) {
          isShuffled = true;
          break;
        }
      }
      if (isShuffled) break;
    }
    expect(isShuffled).toBe(true);
  });

  it('should select questions randomly (different sets over multiple runs)', () => {
    const sets = new Set();
    for (let i = 0; i < 10; i++) {
      const result = initializeGame(mockQuestionPool);
      sets.add(result.map(q => q.id).sort().join(','));
    }
    expect(sets.size).toBeGreaterThan(1);
  });
});