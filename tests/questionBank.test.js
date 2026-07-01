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

describe('Question Bank File', () => {
  test('should exist as a valid JSON file', () => {
    expect(fs.existsSync(QUESTION_BANK_PATH)).toBe(true);
    expect(() => JSON.parse(fs.readFileSync(QUESTION_BANK_PATH, 'utf-8'))).not.toThrow();
  });

  test('should be an array', () => {
    expect(Array.isArray(questionBank)).toBe(true);
  });

  test('should contain exactly 40 questions', () => {
    expect(questionBank.length).toBe(40);
  });
});

describe('Each Question', () => {
  test('should have all required fields', () => {
    questionBank.forEach((q, idx) => {
      REQUIRED_FIELDS.forEach((field) => {
        expect(q).toHaveProperty(field);
        expect(q[field]).not.toBeUndefined();
        expect(q[field]).not.toBeNull();
      });
    });
  });

  test('should have a non-empty statement string', () => {
    questionBank.forEach((q, idx) => {
      expect(typeof q.statement).toBe('string');
      expect(q.statement.trim().length).toBeGreaterThan(0);
    });
  });

  test('should have 3 or 4 options', () => {
    questionBank.forEach((q, idx) => {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.length).toBeLessThanOrEqual(4);
    });
  });

  test('should have all options as non-empty strings', () => {
    questionBank.forEach((q, idx) => {
      q.options.forEach((opt, optIdx) => {
        expect(typeof opt).toBe('string');
        expect(opt.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('should have all unique options per question', () => {
    questionBank.forEach((q, idx) => {
      const normalized = q.options.map((o) => o.trim().toLowerCase());
      const unique = new Set(normalized);
      expect(unique.size).toBe(q.options.length);
    });
  });

  test('should have correctAnswer that matches one of the options', () => {
    questionBank.forEach((q, idx) => {
      expect(q.options).toContain(q.correctAnswer);
    });
  });

  test('should have a non-empty funFact string', () => {
    questionBank.forEach((q, idx) => {
      expect(typeof q.funFact).toBe('string');
      expect(q.funFact.trim().length).toBeGreaterThan(0);
    });
  });

  test('should have a non-empty imageReference string', () => {
    questionBank.forEach((q, idx) => {
      expect(typeof q.imageReference).toBe('string');
      expect(q.imageReference.trim().length).toBeGreaterThan(0);
    });
  });

  test('should have a dinosaur field or identifiable dinosaur in statement', () => {
    questionBank.forEach((q, idx) => {
      const hasDinosaurField = q.dinosaur && typeof q.dinosaur === 'string';
      const statementMentionsDino = REQUIRED_DINOSAURS.some((d) =>
        q.statement.toLowerCase().includes(d.toLowerCase())
      );
      expect(hasDinosaurField || statementMentionsDino).toBe(true);
    });
  });
});

describe('Dinosaur Coverage', () => {
  const getDinosaurForQuestion = (q) => {
    if (q.dinosaur) return q.dinosaur;
    return REQUIRED_DINOSAURS.find((d) =>
      q.statement.toLowerCase().includes(d.toLowerCase())
    );
  };

  REQUIRED_DINOSAURS.forEach((dinosaur) => {
    test(`should have at least 3 questions about ${dinosaur}`, () => {
      const count = questionBank.filter((q) => {
        const dino = getDinosaurForQuestion(q);
        return dino && dino.toLowerCase() === dinosaur.toLowerCase();
      }).length;
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test('every question should be attributable to one of the required dinosaurs', () => {
    questionBank.forEach((q, idx) => {
      const dino = getDinosaurForQuestion(q);
      expect(dino).toBeDefined();
      expect(
        REQUIRED_DINOSAURS.some((d) => d.toLowerCase() === dino.toLowerCase())
      ).toBe(true);
    });
  });

  test('total question count across all dinosaurs should equal 40', () => {
    const counts = REQUIRED_DINOSAURS.map((dinosaur) => {
      return questionBank.filter((q) => {
        const dino = getDinosaurForQuestion(q);
        return dino && dino.toLowerCase() === dinosaur.toLowerCase();
      }).length;
    });
    const total = counts.reduce((sum, c) => sum + c, 0);
    expect(total).toBe(40);
  });
});

describe('Question Quality', () => {
  test('all statements should be unique', () => {
    const statements = questionBank.map((q) => q.statement.trim().toLowerCase());
    const unique = new Set(statements);
    expect(unique.size).toBe(statements.length);
  });

  test('all funFacts should be unique', () => {
    const facts = questionBank.map((q) => q.funFact.trim().toLowerCase());
    const unique = new Set(facts);
    expect(unique.size).toBe(facts.length);
  });

  test('all imageReferences should be unique', () => {
    const refs = questionBank.map((q) => q.imageReference.trim().toLowerCase());
    const unique = new Set(refs);
    expect(unique.size).toBe(refs.length);
  });

  test('statements should be meaningful (length > 10 characters)', () => {
    questionBank.forEach((q, idx) => {
      expect(q.statement.trim().length).toBeGreaterThan(10);
    });
  });

  test('funFacts should be meaningful (length > 10 characters)', () => {
    questionBank.forEach((q, idx) => {
      expect(q.funFact.trim().length).toBeGreaterThan(10);
    });
  });
});
