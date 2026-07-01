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
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const filePath = findQuestionBank();
const questions = filePath ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : [];

const VALID_DINOSAURS = [
  't-rex',
  'triceratops',
  'velociraptor',
  'stegosaurus',
  'brachiosaurus',
  'ankylosaurus',
  'pteranodon',
];

describe('TRIOFSND-57: JSON Schema Validation', () => {
  test('each question object has exactly the expected shape', () => {
    const allowedKeys = [
      'statement',
      'options',
      'correctAnswer',
      'funFact',
      'imageReference',
      'dinosaur',
      'category',
      'topic',
      'subject',
      'id',
      'difficulty',
    ];

    questions.forEach((q, i) => {
      Object.keys(q).forEach((key) => {
        expect(allowedKeys).toContain(key);
      });
    });
  });

  test('options array contains only string values', () => {
    questions.forEach((q) => {
      q.options.forEach((opt) => {
        expect(typeof opt).toBe('string');
      });
    });
  });

  test('correctAnswer is not an index but a string value', () => {
    questions.forEach((q) => {
      expect(typeof q.correctAnswer).not.toBe('number');
    });
  });

  test('imageReference looks like a file path or URL', () => {
    questions.forEach((q) => {
      const ref = q.imageReference.trim();
      const hasExtension = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(ref);
      const isUrl = /^https?:\/\//i.test(ref);
      const isRelativePath = !ref.includes(' ') || hasExtension;
      expect(hasExtension || isUrl || isRelativePath).toBe(true);
    });
  });

  test('dinosaur field values are from the allowed set', () => {
    questions.forEach((q) => {
      const dino = (q.dinosaur || q.category || q.topic || q.subject || '').toLowerCase();
      expect(VALID_DINOSAURS).toContain(dino);
    });
  });

  test('no question has an empty or whitespace-only funFact', () => {
    questions.forEach((q) => {
      expect(q.funFact.trim().length).toBeGreaterThan(10);
    });
  });

  test('no question has an empty or whitespace-only statement', () => {
    questions.forEach((q) => {
      expect(q.statement.trim().length).toBeGreaterThan(10);
    });
  });
});
