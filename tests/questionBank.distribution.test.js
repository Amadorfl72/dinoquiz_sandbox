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

const DINOSAURS = [
  { name: 'T-Rex', aliases: ['t-rex', 'trex', 't rex', 'tyrannosaurus', 'tyrannosaurus rex'] },
  { name: 'Triceratops', aliases: ['triceratops'] },
  { name: 'Velociraptor', aliases: ['velociraptor'] },
  { name: 'Stegosaurus', aliases: ['stegosaurus'] },
  { name: 'Brachiosaurus', aliases: ['brachiosaurus'] },
  { name: 'Ankylosaurus', aliases: ['ankylosaurus'] },
  { name: 'Pteranodon', aliases: ['pteranodon', 'pteranodon'] },
];

function getDinoField(q) {
  return (q.dinosaur || q.category || q.topic || q.subject || '').toLowerCase().trim();
}

function classifyQuestion(q) {
  const dinoField = getDinoField(q);
  for (const d of DINOSAURS) {
    if (d.aliases.includes(dinoField)) return d.name;
  }
  return null;
}

describe('TRIOFSND-57: Dinosaur Distribution', () => {
  const distribution = {};
  DINOSAURS.forEach((d) => (distribution[d.name] = 0));

  questions.forEach((q) => {
    const dino = classifyQuestion(q);
    if (dino) distribution[dino]++;
  });

  test('T-Rex has at least 3 questions', () => {
    expect(distribution['T-Rex']).toBeGreaterThanOrEqual(3);
  });

  test('Triceratops has at least 3 questions', () => {
    expect(distribution['Triceratops']).toBeGreaterThanOrEqual(3);
  });

  test('Velociraptor has at least 3 questions', () => {
    expect(distribution['Velociraptor']).toBeGreaterThanOrEqual(3);
  });

  test('Stegosaurus has at least 3 questions', () => {
    expect(distribution['Stegosaurus']).toBeGreaterThanOrEqual(3);
  });

  test('Brachiosaurus has at least 3 questions', () => {
    expect(distribution['Brachiosaurus']).toBeGreaterThanOrEqual(3);
  });

  test('Ankylosaurus has at least 3 questions', () => {
    expect(distribution['Ankylosaurus']).toBeGreaterThanOrEqual(3);
  });

  test('Pteranodon has at least 3 questions', () => {
    expect(distribution['Pteranodon']).toBeGreaterThanOrEqual(3);
  });

  test('minimum 3 per dinosaur × 7 dinosaurs = 21 minimum accounted for', () => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(21);
  });

  test('all 40 questions are classified to a known dinosaur', () => {
    const unclassified = questions.filter((q) => classifyQuestion(q) === null);
    expect(unclassified.length).toBe(0);
  });

  test('distribution sums to exactly 40', () => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(40);
  });

  test('no single dinosaur dominates (max 10 questions per dinosaur)', () => {
    Object.values(distribution).forEach((count) => {
      expect(count).toBeLessThanOrEqual(10);
    });
  });
});
