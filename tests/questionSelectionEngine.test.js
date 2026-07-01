const fs = require('fs');
const QuestionSelectionEngine = require('../src/services/questionSelectionEngine');

jest.mock('fs');

describe('QuestionSelectionEngine', () => {
  let engine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new QuestionSelectionEngine();
  });

  describe('loadBank', () => {
    it('should load a valid JSON bank from file', () => {
      const mockData = JSON.stringify([
        { id: 1, text: 'Q1', options: ['A', 'B'], answer: 'A' },
        { id: 2, text: 'Q2', options: ['A', 'B'], answer: 'B' }
      ]);
      fs.readFileSync.mockReturnValue(mockData);

      const result = engine.loadBank('dummy/path.json');
      expect(fs.readFileSync).toHaveBeenCalledWith('dummy/path.json', 'utf8');
      expect(result).toBe(true);
      expect(engine.questionBank.length).toBe(2);
    });

    it('should throw an error if the file does not exist', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => engine.loadBank('invalid/path.json')).toThrow('File not found');
    });

    it('should throw an error if the JSON is invalid', () => {
      fs.readFileSync.mockReturnValue('{ invalid json }');
      expect(() => engine.loadBank('corrupted.json')).toThrow(SyntaxError);
    });
  });

  describe('validateBank', () => {
    it('should validate a correctly formatted question bank', () => {
      engine.questionBank = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        text: `Question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        answer: 'A'
      }));

      expect(() => engine.validateBank()).not.toThrow();
      expect(engine.isValid).toBe(true);
    });

    it('should throw an error if there are fewer than 10 questions', () => {
      engine.questionBank = Array.from({ length: 9 }, (_, i) => ({
        id: i + 1,
        text: `Question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        answer: 'A'
      }));

      expect(() => engine.validateBank()).toThrow('Question bank must contain at least 10 questions');
      expect(engine.isValid).toBe(false);
    });

    it('should throw an error if a question is missing required fields', () => {
      engine.questionBank = [
        { id: 1, text: 'Q1', options: ['A', 'B'], answer: 'A' },
        { id: 2, text: 'Q2', options: ['A', 'B'] }
      ];
      for(let i=3; i<=10; i++) engine.questionBank.push({ id: i, text: `Q${i}`, options: ['A', 'B'], answer: 'A' });

      expect(() => engine.validateBank()).toThrow('Question 2 is missing required fields');
    });
  });

  describe('selectRandomQuestions', () => {
    beforeEach(() => {
      engine.questionBank = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        text: `Question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        answer: 'A'
      }));
      engine.isValid = true;
    });

    it('should select exactly 10 questions by default', () => {
      const selected = engine.selectRandomQuestions();
      expect(selected).toHaveLength(10);
    });

    it('should select a specified number of questions', () => {
      const selected = engine.selectRandomQuestions(5);
      expect(selected).toHaveLength(5);
    });

    it('should not select any duplicate questions', () => {
      const selected = engine.selectRandomQuestions(10);
      const ids = selected.map(q => q.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(10);
    });

    it('should throw an error if the bank is not validated', () => {
      engine.isValid = false;
      expect(() => engine.selectRandomQuestions()).toThrow('Question bank is not validated');
    });

    it('should throw an error if requesting more questions than available', () => {
      expect(() => engine.selectRandomQuestions(25)).toThrow('Requested more questions than available in the bank');
    });
  });
});