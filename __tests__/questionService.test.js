const fs = require('fs');
const path = require('path');
const QuestionService = require('../src/services/questionService');

describe('QuestionService - TRIOFSND-58: Random Question Selection Engine', () => {
  let validBankPath;
  let emptyBankPath;
  let malformedBankPath;
  let insufficientBankPath;
  let duplicateIdBankPath;

  const validQuestions = [
    { id: 1, category: 'Science', question: 'What is H2O?', answer: 'Water', difficulty: 'easy' },
    { id: 2, category: 'History', question: 'Who was the first US president?', answer: 'George Washington', difficulty: 'easy' },
    { id: 3, category: 'Geography', question: 'Capital of France?', answer: 'Paris', difficulty: 'easy' },
    { id: 4, category: 'Math', question: 'What is 2+2?', answer: '4', difficulty: 'easy' },
    { id: 5, category: 'Science', question: 'What planet is closest to the sun?', answer: 'Mercury', difficulty: 'medium' },
    { id: 6, category: 'History', question: 'Year of moon landing?', answer: '1969', difficulty: 'medium' },
    { id: 7, category: 'Geography', question: 'Largest ocean?', answer: 'Pacific', difficulty: 'easy' },
    { id: 8, category: 'Math', question: 'Square root of 144?', answer: '12', difficulty: 'medium' },
    { id: 9, category: 'Science', question: 'Chemical symbol for gold?', answer: 'Au', difficulty: 'medium' },
    { id: 10, category: 'History', question: 'Who wrote the Declaration of Independence?', answer: 'Thomas Jefferson', difficulty: 'medium' },
    { id: 11, category: 'Geography', question: 'Capital of Japan?', answer: 'Tokyo', difficulty: 'easy' },
    { id: 12, category: 'Math', question: 'What is 7 x 8?', answer: '56', difficulty: 'easy' },
    { id: 13, category: 'Science', question: 'Speed of light?', answer: '299792458 m/s', difficulty: 'hard' },
    { id: 14, category: 'History', question: 'When did WWII end?', answer: '1945', difficulty: 'medium' },
    { id: 15, category: 'Geography', question: 'Longest river?', answer: 'Nile', difficulty: 'medium' }
  ];

  beforeAll(() => {
    const tmpDir = path.join(__dirname, 'tmp_fixtures');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    validBankPath = path.join(tmpDir, 'validBank.json');
    fs.writeFileSync(validBankPath, JSON.stringify(validQuestions));

    emptyBankPath = path.join(tmpDir, 'emptyBank.json');
    fs.writeFileSync(emptyBankPath, JSON.stringify([]));

    malformedBankPath = path.join(tmpDir, 'malformedBank.json');
    fs.writeFileSync(malformedBankPath, '{ this is not valid json');

    insufficientBankPath = path.join(tmpDir, 'insufficientBank.json');
    fs.writeFileSync(insufficientBankPath, JSON.stringify(validQuestions.slice(0, 5)));

    duplicateIdBankPath = path.join(tmpDir, 'duplicateIdBank.json');
    const dupBank = [
      ...validQuestions.slice(0, 10),
      { id: 1, category: 'Science', question: 'Duplicate?', answer: 'Yes', difficulty: 'easy' }
    ];
    fs.writeFileSync(duplicateIdBankPath, JSON.stringify(dupBank));
  });

  afterAll(() => {
    const tmpDir = path.join(__dirname, 'tmp_fixtures');
    if (fs.existsSync(tmpDir)) {
      fs.readdirSync(tmpDir).forEach(f => fs.unlinkSync(path.join(tmpDir, f)));
      fs.rmdirSync(tmpDir);
    }
  });

  describe('Loading and validation on startup', () => {
    test('should successfully load and validate a valid JSON bank', () => {
      const service = new QuestionService(validBankPath);
      expect(service.getBankSize()).toBe(15);
      expect(service.isBankValid()).toBe(true);
    });

    test('should throw an error if the bank file does not exist', () => {
      expect(() => new QuestionService('/nonexistent/path/bank.json')).toThrow(/file not found|ENOENT/i);
    });

    test('should throw an error if the JSON is malformed', () => {
      expect(() => new QuestionService(malformedBankPath)).toThrow(/JSON|parse/i);
    });

    test('should throw an error if the bank is empty', () => {
      expect(() => new QuestionService(emptyBankPath)).toThrow(/empty|at least/i);
    });

    test('should throw an error if the bank has fewer than 10 questions', () => {
      expect(() => new QuestionService(insufficientBankPath)).toThrow(/at least 10|insufficient|too few/i);
    });

    test('should throw an error if the bank contains duplicate question IDs', () => {
      expect(() => new QuestionService(duplicateIdBankPath)).toThrow(/duplicate|unique/i);
    });

    test('should throw if any question is missing required fields', () => {
      const tmpDir = path.join(__dirname, 'tmp_fixtures');
      const missingFieldPath = path.join(tmpDir, 'missingFieldBank.json');
      const badBank = validQuestions.slice(0, 10).map((q, i) =>
        i === 0 ? { id: 1, category: 'Science', question: 'No answer field' } : q
      );
      fs.writeFileSync(missingFieldPath, JSON.stringify(badBank));
      expect(() => new QuestionService(missingFieldPath)).toThrow(/missing|required|answer/i);
      fs.unlinkSync(missingFieldPath);
    });
  });

  describe('Random question selection for a game session', () => {
    let service;

    beforeAll(() => {
      service = new QuestionService(validBankPath);
    });

    test('should select exactly 10 questions', () => {
 const selected = service.selectQuestionsForSession();
      expect(selected).toHaveLength(10);
    });

    test('should not repeat questions within a single session', () => {
      const selected = service.selectQuestionsForSession();
      const ids = selected.map(q => q.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(ids.length);
    });

    test('should return question objects with all expected properties', () => {
      const selected = service.selectQuestionsForSession();
      selected.forEach(q => {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('category');
        expect(q).toHaveProperty('question');
        expect(q).toHaveProperty('answer');
        expect(q).toHaveProperty('difficulty');
      });
    });

    test('should return different selections across multiple sessions (randomness)', () => {
      const sessions = [];
      for (let i = 0; i < 20; i++) {
        sessions.push(service.selectQuestionsForSession().map(q => q.id).join(','));
      }
      const uniqueSessions = new Set(sessions);
      // With 15 questions choosing 10, there are 3003 combinations.
      // We expect at least 2 unique orderings out of 20 sessions.
      expect(uniqueSessions.size).toBeGreaterThan(1);
    });

    test('should not mutate the original bank when selecting', () => {
      const sizeBefore = service.getBankSize();
      service.selectQuestionsForSession();
      service.selectQuestionsForSession();
      const sizeAfter = service.getBankSize();
      expect(sizeAfter).toBe(sizeBefore);
    });

    test('should only return questions that exist in the bank', () => {
      const selected = service.selectQuestionsForSession();
      const bankIds = new Set(validQuestions.map(q => q.id));
      selected.forEach(q => {
        expect(bankIds.has(q.id)).toBe(true);
      });
    });

    test('each new session should be independent (no state carryover)', () => {
      const session1 = service.selectQuestionsForSession();
      const session2 = service.selectQuestionsForSession();
      // Both should have 10 unique questions
      expect(session1).toHaveLength(10);
      expect(session2).toHaveLength(10);
      // Session 2 should not be affected by session 1's selection
      const s1Ids = new Set(session1.map(q => q.id));
      const s2Ids = new Set(session2.map(q => q.id));
      expect(s2Ids.size).toBe(10);
    });
  });

  describe('Edge cases', () => {
    test('should work correctly when bank has exactly 10 questions', () => {
      const tmpDir = path.join(__dirname, 'tmp_fixtures');
      const exactBankPath = path.join(tmpDir, 'exactBank.json');
      fs.writeFileSync(exactBankPath, JSON.stringify(validQuestions.slice(0, 10)));
      const service = new QuestionService(exactBankPath);
      const selected = service.selectQuestionsForSession();
      expect(selected).toHaveLength(10);
      const ids = selected.map(q => q.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(10);
      fs.unlinkSync(exactBankPath);
    });

    test('should throw if selectQuestionsForSession is called on an uninitialized service', () => {
      const service = new QuestionService(validBankPath);
      // Simulate uninitialized state
      service._bank = null;
      expect(() => service.selectQuestionsForSession()).toThrow(/not initialized|no bank/i);
    });
  });
});
