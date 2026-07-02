const fs = require('fs');
const path = require('path');

const QUESTION_BANK_PATH = path.resolve(__dirname, '../data/questionBank.json');

const REQUIRED_DINOSAURS = [
  'T-Rex',
  'Triceratops',
  'Velociraptor',
  'Stegosaurus',
  'Brachiosaurus',
  'Ankylosaurus',
  'Pteranodon',
];

const REQUIRED_FIELDS = [
  'statement',
  'options',
  'correctAnswer',
  'funFact',
  'imageReference',
];

let questionBank;

beforeAll(() => {
  const raw = fs.readFileSync(QUESTION_BANK_PATH, 'utf-8');
  questionBank = JSON.parse(raw);
});

describe('TRIOFSND-57: Local JSON Question Bank', () => {
  test('the JSON file exists at data/questionBank.json', () => {
    expect(fs.existsSync(QUESTION_BANK_PATH)).toBe(true);
  });

  test('the file contains valid JSON', () => {
    expect(() => JSON.parse(fs.readFileSync(QUESTION_BANK_PATH, 'utf-8'))).not.toThrow();
  });

  test('the root is an array of questions', () => {
    expect(Array.isArray(questionBank)).toBe(true);
  });

  test('there are exactly 40 questions', () => {
    expect(questionBank.length).toBe(40);
  });

  test('every question has all required fields', () => {
    questionBank.forEach((q, idx) => {
      REQUIRED_FIELDS.forEach((field) => {
        expect(q).toHaveProperty(field);
        expect(q[field]).not.toBeUndefined();
        expect(q[field]).not.toBeNull();
      });
    });
  });

  test('every question has a non-empty string statement', () => {
    questionBank.forEach((q, idx) => {
      expect(typeof q.statement).toBe('string');
      expect(q.statement.trim().length).toBeGreaterThan(0);
    });
  });

  test('every question has an options array with 3 or 4 entries', () => {
    questionBank.forEach((q, idx) => {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.length).toBeLessThanOrEqual(4);
    });
  });

  test('every option is a non-empty string', () => {
    questionBank.forEach((q, idx) => {
      q.options.forEach((opt) => {
        expect(typeof opt).toBe('string');
        expect(opt.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('every question has a non-empty string correctAnswer', () => {
    questionBank.forEach((q, idx) => {
      expect(typeof q.correctAnswer).toBe('string');
      expect(q.correctAnswer.trim().length).toBeGreaterThan(0);
    });
  });

  test('correctAnswer is always one of the provided options', () => {
    questionBank.forEach((q, idx) => {
      expect(q.options).toContain(q.correctAnswer);
    });
  });

  test('every question has a non-empty string funFact', () => {
    questionBank.forEach((q, idx) => {
      expect(typeof q.funFact).toBe('string');
      expect(q.funFact.trim().length).toBeGreaterThan(0);
    });
  });

  test('every question has a non-empty string imageReference', () => {
    questionBank.forEach((q, idx) => {
      expect(typeof q.imageReference).toBe('string');
      expect(q.imageReference.trim().length).toBeGreaterThan(0);
    });
  });

  test('every question references one of the required dinosaurs', () => {
    questionBank.forEach((q, idx) => {
      const text = `${q.statement} ${q.options.join(' ')} ${q.funFact}`.toLowerCase();
      const matched = REQUIRED_DINOSAURS.some((d) =>
        text.includes(d.toLowerCase())
      );
      expect(matched).toBe(true);
    });
  });

  test('each required dinosaur has at least 3 questions', () => {
    REQUIRED_DINOSAURS.forEach((dino) => {
      const count = questionBank.filter((q) => {
        const text = `${q.statement} ${q.options.join(' ')} ${q.funFact}`.toLowerCase();
        return text.includes(dino.toLowerCase());
      }).length;
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test('there are no duplicate questions (by statement)', () => {
    const statements = questionBank.map((q) => q.statement.trim().toLowerCase());
    const unique = new Set(statements);
    expect(unique.size).toBe(statements.length);
  });

  test('options within a single question are unique', () => {
    questionBank.forEach((q, idx) => {
      const lower = q.options.map((o) => o.trim().toLowerCase());
      const unique = new Set(lower);
      expect(unique.size).toBe(lower.length);
    });
  });

  test('imageReference values are unique across all questions', () => {
    const refs = questionBank.map((q) => q.imageReference.trim());
    const unique = new Set(refs);
    expect(unique.size).toBe(refs.length);
  });
});
