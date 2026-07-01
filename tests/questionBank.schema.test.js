const fs = require('fs');
const path = require('path');

const QUESTION_BANK_PATH = path.resolve(__dirname, '../data/questionBank.json');

let questionBank;

beforeAll(() => {
  const raw = fs.readFileSync(QUESTION_BANK_PATH, 'utf-8');
  questionBank = JSON.parse(raw);
});

describe('JSON Schema Validation', () => {
  test('each question should conform to the expected schema', () => {
    questionBank.forEach((question, index) => {
      // Top-level keys check
      const allowedKeys = [
        'statement',
        'options',
        'correctAnswer',
        'funFact',
        'imageReference',
        'dinosaur',
      ];
      Object.keys(question).forEach((key) => {
        expect(allowedKeys).toContain(key);
      });

      // Type checks
      expect(typeof question.statement).toBe('string');
      expect(Array.isArray(question.options)).toBe(true);
      expect(typeof question.correctAnswer).toBe('string');
      expect(typeof question.funFact).toBe('string');
      expect(typeof question.imageReference).toBe('string');

      // Options array element type check
      question.options.forEach((opt) => {
        expect(typeof opt).toBe('string');
      });

      // correctAnswer must be in options
      expect(question.options).toContain(question.correctAnswer);
    });
  });

  test('should not have any null or undefined values in any field', () => {
    const checkNoNullUndefined = (obj, path = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        expect(value).not.toBeNull();
        expect(value).not.toBeUndefined();
        if (typeof value === 'object' && !Array.isArray(value)) {
          checkNoNullUndefined(value, currentPath);
        }
        if (Array.isArray(value)) {
          value.forEach((item, idx) => {
            expect(item).not.toBeNull();
            expect(item).not.toBeUndefined();
            if (typeof item === 'object') {
              checkNoNullUndefined(item, `${currentPath}[${idx}]`);
            }
          });
        }
      });
    };

    questionBank.forEach((q, idx) => {
      checkNoNullUndefined(q, `question[${idx}]`);
    });
  });

  test('imageReference should be a valid file path or URL format', () => {
    questionBank.forEach((q, idx) => {
      const ref = q.imageReference.trim();
      const isUrl = /^(https?:\/\/|www\.)/.test(ref);
      const isFilePath = /^\.?\.?\/|^[\w-]+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(ref);
      const isAssetName = /^[\w/-]+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(ref);
      expect(isUrl || isFilePath || isAssetName).toBe(true);
    });
  });

  test('correctAnswer should not be an empty string', () => {
    questionBank.forEach((q, idx) => {
      expect(q.correctAnswer.trim().length).toBeGreaterThan(0);
    });
  });

  test('options should not contain empty strings', () => {
    questionBank.forEach((q, idx) => {
      q.options.forEach((opt, optIdx) => {
        expect(opt.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
