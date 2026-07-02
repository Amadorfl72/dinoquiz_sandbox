const fs = require('fs');
const path = require('path');

const QUESTION_BANK_PATH = path.resolve(__dirname, '../src/assets/questions.json');

const REQUIRED_DINOSAURS = [
  'T-Rex',
  'Triceratops',
  'Velociraptor',
  'Stegosaurus',
  'Brachiosaurus',
  'Ankylosaurus',
  'Pteranodon',
];

let questionBank;

beforeAll(() => {
  const raw = fs.readFileSync(QUESTION_BANK_PATH, 'utf-8');
  questionBank = JSON.parse(raw);
});

function countQuestionsForDino(dino) {
  return questionBank.filter((q) => q.dinosaur === dino).length;
}

describe('TRIOFSND-57: Dinosaur Coverage Distribution', () => {
  test('T-Rex has at least 3 questions', () => {
    expect(countQuestionsForDino('T-Rex')).toBeGreaterThanOrEqual(3);
  });

  test('Triceratops has at least 3 questions', () => {
    expect(countQuestionsForDino('Triceratops')).toBeGreaterThanOrEqual(3);
  });

  test('Velociraptor has at least 3 questions', () => {
    expect(countQuestionsForDino('Velociraptor')).toBeGreaterThanOrEqual(3);
  });

  test('Stegosaurus has at least 3 questions', () => {
    expect(countQuestionsForDino('Stegosaurus')).toBeGreaterThanOrEqual(3);
  });

  test('Brachiosaurus has at least 3 questions', () => {
    expect(countQuestionsForDino('Brachiosaurus')).toBeGreaterThanOrEqual(3);
  });

  test('Ankylosaurus has at least 3 questions', () => {
    expect(countQuestionsForDino('Ankylosaurus')).toBeGreaterThanOrEqual(3);
  });

  test('Pteranodon has at least 3 questions', () => {
    expect(countQuestionsForDino('Pteranodon')).toBeGreaterThanOrEqual(3);
  });

  test('total minimum coverage (7 dinosaurs x 3 = 21) does not exceed 40', () => {
    const totalMin = REQUIRED_DINOSAURS.length * 3;
    expect(totalMin).toBeLessThanOrEqual(40);
  });

  test('sum of per-dinosaur counts accounts for all 40 questions', () => {
    const total = REQUIRED_DINOSAURS.reduce(
      (sum, dino) => sum + countQuestionsForDino(dino),
      0
    );
    expect(total).toBe(40);
  });

  test('every question has a dinosaur field matching one of the required dinosaurs', () => {
    questionBank.forEach((q) => {
      expect(REQUIRED_DINOSAURS).toContain(q.dinosaur);
    });
  });
});
