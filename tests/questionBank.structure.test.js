const fs = require('fs');
const path = require('path');

const QUESTION_BANK_PATH = path.resolve(__dirname, '../src/assets/questions.json');

let questionBank;

beforeAll(() => {
  const raw = fs.readFileSync(QUESTION_BANK_PATH, 'utf-8');
  questionBank = JSON.parse(raw);
});

describe('TRIOFSND-57: Question Bank Structural Integrity', () => {
  test('each question object has exactly the expected keys', () => {
    const expectedKeys = [
      'id',
      'dinosaur',
      'statement',
      'options',
      'correctAnswer',
      'funFact',
      'imageReference',
    ].sort();

    questionBank.forEach((q, idx) => {
      const actualKeys = Object.keys(q).sort();
      expect(actualKeys).toEqual(expectedKeys);
    });
  });

  test('no question has extra or missing fields', () => {
    const expectedFields = new Set([
      'id',
      'dinosaur',
      'statement',
      'options',
      'correctAnswer',
      'funFact',
      'imageReference',
    ]);

    questionBank.forEach((q, idx) => {
      Object.keys(q).forEach((key) => {
        expect(expectedFields.has(key)).toBe(true);
      });
    });
  });

  test('statement is at least 10 characters long', () => {
    questionBank.forEach((q) => {
      expect(q.statement.trim().length).toBeGreaterThanOrEqual(10);
    });
  });

  test('funFact is at least 10 characters long', () => {
    questionBank.forEach((q) => {
      expect(q.funFact.trim().length).toBeGreaterThanOrEqual(10);
    });
  });

  test('imageReference looks like a file path or URL', () => {
    const pattern = /^(\/|\.\/|\.\.\/|https?:\/\/|assets\/|images\/|data\/)/i;
    questionBank.forEach((q) => {
      const ref = q.imageReference.trim();
      const isPath =
        pattern.test(ref) ||
        ref.endsWith('.png') ||
        ref.endsWith('.jpg') ||
        ref.endsWith('.jpeg') ||
        ref.endsWith('.svg') ||
        ref.endsWith('.webp') ||
        ref.endsWith('.gif');
      expect(isPath).toBe(true);
    });
  });

  test('correctAnswer is not an empty or whitespace-only string', () => {
    questionBank.forEach((q) => {
      expect(q.correctAnswer.trim().length).toBeGreaterThan(0);
    });
  });

  test('all options are non-empty and non-whitespace strings', () => {
    questionBank.forEach((q) => {
      q.options.forEach((opt) => {
        expect(opt.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('question statements end with a question mark or period', () => {
    questionBank.forEach((q) => {
      const last = q.statement.trim().slice(-1);
      expect(['?', '.']).toContain(last);
    });
  });

  test('id is a positive integer for every question', () => {
    questionBank.forEach((q) => {
      expect(Number.isInteger(q.id)).toBe(true);
      expect(q.id).toBeGreaterThan(0);
    });
  });

  test('ids are sequential from 1 to 40', () => {
    const ids = questionBank.map((q) => q.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });
});
