const QuestionService = require('../src/services/questionService');

// Unit tests focusing on the selection algorithm with injected mock data
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}));

const fs = require('fs');

function createMockQuestion(id) {
  return {
    id,
    category: 'Test',
    question: `Question ${id}?`,
    answer: `Answer ${id}`,
    difficulty: 'easy'
  };
}

function setupMockBank(count) {
  const bank = Array.from({ length: count }, (_, i) => createMockQuestion(i + 1));
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue(JSON.stringify(bank));
  return bank;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('QuestionService - Selection Algorithm Unit Tests', () => {
  test('selectQuestionsForSession returns exactly 10 unique questions from a 15-question bank', () => {
    setupMockBank(15);
    const service = new QuestionService('/mock/bank.json');
    const result = service.selectQuestionsForSession();

    expect(result).toHaveLength(10);
    const ids = result.map(q => q.id);
    expect(new Set(ids).size).toBe(10);
  });

  test('selection uses Fisher-Yates or equivalent (no bias detectable in large sample)', () => {
    setupMockBank(12);
    const service = new QuestionService('/mock/bank.json');

    const positionCounts = {};
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const selected = service.selectQuestionsForSession();
      selected.forEach((q, idx) => {
        const key = `${q.id}-pos${idx}`;
        positionCounts[key] = (positionCounts[key] || 0) + 1;
      });
    }

    // Each question should appear roughly 10/12 of the time across sessions
    // and in each position roughly 1/12 of the time it appears.
    // We check that no question is systematically excluded.
    for (let qid = 1; qid <= 12; qid++) {
      let totalAppearances = 0;
      for (let pos = 0; pos < 10; pos++) {
        totalAppearances += positionCounts[`${qid}-pos${pos}`] || 0;
      }
      // Each question should appear in roughly 833 out of 1000 sessions (10/12 * 1000)
      // Allow a wide tolerance for randomness
      expect(totalAppearances).toBeGreaterThan(600);
      expect(totalAppearances).toBeLessThan(1100);
    }
  });

  test('selectQuestionsForSession returns new array instance each call', () => {
    setupMockBank(15);
    const service = new QuestionService('/mock/bank.json');
    const result1 = service.selectQuestionsForSession();
    const result2 = service.selectQuestionsForSession();
    expect(result1).not.toBe(result2);
  });

  test('returned question objects are deep copies, not references to bank objects', () => {
    setupMockBank(15);
    const service = new QuestionService('/mock/bank.json');
    const selected = service.selectQuestionsForSession();
    const bank = service.getBank();

    selected.forEach(selQ => {
      const bankQ = bank.find(bq => bq.id === selQ.id);
      expect(selQ).not.toBe(bankQ);
      expect(selQ).toEqual(bankQ);
    });
  });

  test('modifying returned questions does not affect the bank', () => {
    setupMockBank(15);
    const service = new QuestionService('/mock/bank.json');
    const bankBefore = JSON.stringify(service.getBank());

    const selected = service.selectQuestionsForSession();
    selected[0].question = 'MODIFIED';
    selected[0].answer = 'HACKED';

    const bankAfter = JSON.stringify(service.getBank());
    expect(bankAfter).toBe(bankBefore);
  });

  test('getBankSize returns correct count', () => {
    setupMockBank(20);
    const service = new QuestionService('/mock/bank.json');
    expect(service.getBankSize()).toBe(20);
  });

  test('getBank returns a copy, not the internal array', () => {
    setupMockBank(15);
    const service = new QuestionService('/mock/bank.json');
    const bank1 = service.getBank();
    const bank2 = service.getBank();
    expect(bank1).not.toBe(bank2);
    expect(bank1).toEqual(bank2);
  });
});
