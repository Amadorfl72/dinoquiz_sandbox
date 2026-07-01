const fs = require('fs');
const path = require('path');

const POSSIBLE_PATHS = [
  'src/data/questionBank.json',
  'src/data/questions.json',
  'src/data/question-bank.json',
  'data/questionBank.json',
  'data/questions.json',
  'data/question-bank.json',
  'questionBank.json',
  'questions.json',
  'question-bank.json',
];

function findQuestionBank() {
  for (const p of POSSIBLE_PATHS) {
    const full = path.resolve(process.cwd(), p);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

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

let questions = [];
let filePath = null;

beforeAll(() => {
  filePath = findQuestionBank();
  if (filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    questions = JSON.parse(raw);
  }
});

describe('TRIOFSND-57: Local JSON Question Bank', () => {
  test('a JSON question bank file exists', () => {
    expect(filePath).not.toBeNull();
  });

  test('file contains valid JSON', () => {
    expect(filePath).not.toBeNull();
    expect(() => JSON.parse(fs.readFileSync(filePath, 'utf-8'))).not.toThrow();
  });

  test('JSON is an array of exactly 40 questions', () => {
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(40);
  });

  test('every question has all required fields', () => {
    questions.forEach((q, i) => {
      REQUIRED_FIELDS.forEach((field) => {
        expect(q).toHaveProperty(field);
        expect(q[field]).not.toBeUndefined();
        expect(q[field]).not.toBeNull();
      });
    });
  });

  test('every question statement is a non-empty string', () => {
    questions.forEach((q) => {
      expect(typeof q.statement).toBe('string');
      expect(q.statement.trim().length).toBeGreaterThan(0);
    });
  });

  test('every question has between 3 and 4 options', () => {
    questions.forEach((q) => {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.length).toBeLessThanOrEqual(4);
    });
  });

  test('every option is a non-empty string', () => {
    questions.forEach((q) => {
      q.options.forEach((opt) => {
        expect(typeof opt).toBe('string');
        expect(opt.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('all options within a question are unique', () => {
    questions.forEach((q) => {
      const normalized = q.options.map((o) => o.trim().toLowerCase());
      const unique = new Set(normalized);
      expect(unique.size).toBe(normalized.length);
    });
  });

  test('correctAnswer is a non-empty string', () => {
    questions.forEach((q) => {
      expect(typeof q.correctAnswer).toBe('string');
      expect(q.correctAnswer.trim().length).toBeGreaterThan(0);
    });
  });

  test('correctAnswer matches one of the options', () => {
    questions.forEach((q) => {
      const normalizedOptions = q.options.map((o) => o.trim().toLowerCase());
      const normalizedAnswer = q.correctAnswer.trim().toLowerCase();
      expect(normalizedOptions).toContain(normalizedAnswer);
    });
  });

  test('funFact is a non-empty string', () => {
    questions.forEach((q) => {
      expect(typeof q.funFact).toBe('string');
      expect(q.funFact.trim().length).toBeGreaterThan(0);
    });
  });

  test('imageReference is a non-empty string', () => {
    questions.forEach((q) => {
      expect(typeof q.imageReference).toBe('string');
      expect(q.imageReference.trim().length).toBeGreaterThan(0);
    });
  });

  test('every question is associated with one of the required dinosaurs', () => {
    const validDinos = REQUIRED_DINOSAURS.map((d) => d.toLowerCase());
    questions.forEach((q) => {
      const dino = (q.dinosaur || q.category || q.topic || q.subject || '').toLowerCase();
      expect(validDinos).toContain(dino);
    });
  });

  test('each required dinosaur has at least 3 questions', () => {
    const counts = {};
    REQUIRED_DINOSAURS.forEach((d) => (counts[d.toLowerCase()] = 0));

    questions.forEach((q) => {
      const dino = (q.dinosaur || q.category || q.topic || q.subject || '').toLowerCase();
      if (counts.hasOwnProperty(dino)) {
        counts[dino]++;
      }
    });

    REQUIRED_DINOSAURS.forEach((d) => {
      expect(counts[d.toLowerCase()]).toBeGreaterThanOrEqual(3);
    });
  });

  test('total question count across all dinosaurs equals 40', () => {
    const counts = {};
    REQUIRED_DINOSAURS.forEach((d) => (counts[d.toLowerCase()] = 0));

    questions.forEach((q) => {
      const dino = (q.dinosaur || q.category || q.topic || q.subject || '').toLowerCase();
      if (counts.hasOwnProperty(dino)) {
        counts[dino]++;
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(40);
  });

  test('no duplicate question statements exist', () => {
    const statements = questions.map((q) => q.statement.trim().toLowerCase());
    const unique = new Set(statements);
    expect(unique.size).toBe(statements.length);
  });

  test('image references are not all identical (indicates real references)', () => {
    const refs = questions.map((q) => q.imageReference.trim());
    const unique = new Set(refs);
    expect(unique.size).toBeGreaterThan(1);
  });
});
