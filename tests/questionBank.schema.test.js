const fs = require('fs');
const path = require('path');

const QUESTION_BANK_PATH = path.resolve(__dirname, '../src/assets/questions.json');

const VALID_DINOSAURS = [
  'T-Rex',
  'Triceratops',
  'Velociraptor',
  'Stegosaurus',
  'Brachiosaurus',
  'Ankylosaurus',
  'Pteranodon',
];

function loadQuestionBank() {
  const raw = fs.readFileSync(QUESTION_BANK_PATH, 'utf-8');
  return JSON.parse(raw);
}

describe('TRIOFSND-57: JSON Schema Validation', () => {
  let questionBank;

  beforeAll(() => {
    questionBank = loadQuestionBank();
  });

  test('JSON should conform to expected schema', () => {
    expect(Array.isArray(questionBank)).toBe(true);
    expect(questionBank.length).toBe(40);

    questionBank.forEach((question, index) => {
      const expectedKeys = [
        'id',
        'dinosaur',
        'statement',
        'options',
        'correctAnswer',
        'funFact',
        'imageReference',
      ];
      const actualKeys = Object.keys(question).sort();
      expectedKeys.sort().forEach((key) => {
        expect(actualKeys).toContain(key);
      });

      expect(typeof question.id).toBe('number');
      expect(question.id).toBeGreaterThan(0);

      expect(typeof question.dinosaur).toBe('string');
      expect(VALID_DINOSAURS).toContain(question.dinosaur);

      expect(typeof question.statement).toBe('string');
      expect(question.statement.length).toBeGreaterThan(10);

      expect(Array.isArray(question.options)).toBe(true);
      expect(question.options.length).toBeGreaterThanOrEqual(3);
      expect(question.options.length).toBeLessThanOrEqual(4);
      question.options.forEach((opt) => {
        expect(typeof opt).toBe('string');
        expect(opt.length).toBeGreaterThan(0);
      });

      expect(typeof question.correctAnswer).toBe('string');
      expect(question.options).toContain(question.correctAnswer);

      expect(typeof question.funFact).toBe('string');
      expect(question.funFact.length).toBeGreaterThan(10);

      expect(typeof question.imageReference).toBe('string');
      expect(question.imageReference.length).toBeGreaterThan(0);
    });
  });

  test('imageReference should have a valid file extension', () => {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    questionBank.forEach((question, index) => {
      const ext = path.extname(question.imageReference).toLowerCase();
      expect(validExtensions).toContain(ext);
    });
  });

  test('no extra unexpected fields in questions', () => {
    const allowedKeys = new Set([
      'id',
      'dinosaur',
      'statement',
      'options',
      'correctAnswer',
      'funFact',
      'imageReference',
    ]);
    questionBank.forEach((question, index) => {
      Object.keys(question).forEach((key) => {
        expect(allowedKeys.has(key)).toBe(true);
      });
    });
  });

  test('all ids are unique positive integers', () => {
    const ids = questionBank.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    ids.forEach((id) => {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    });
  });
});
