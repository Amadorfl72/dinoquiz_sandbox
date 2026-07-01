const fs = require('fs');
const path = require('path');

describe('TRIOFSND-57: Local JSON Question Bank', () => {
  let questions;
  const expectedDinosaurs = [
    'T-Rex',
    'Triceratops',
    'Velociraptor',
    'Stegosaurus',
    'Brachiosaurus',
    'Ankylosaurus',
    'Pteranodon'
  ];

  beforeAll(() => {
    const filePath = path.resolve(__dirname, '../questions.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    questions = JSON.parse(fileContent);
  });

  test('should have exactly 40 questions', () => {
    expect(questions.length).toBe(40);
  });

  test('each question should have valid structure and fields', () => {
    questions.forEach((q, index) => {
      expect(q).toHaveProperty('statement');
      expect(typeof q.statement).toBe('string');
      expect(q.statement.length).toBeGreaterThan(0);

      expect(q).toHaveProperty('options');
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.length).toBeLessThanOrEqual(4);
      q.options.forEach(opt => {
        expect(typeof opt).toBe('string');
        expect(opt.length).toBeGreaterThan(0);
      });

      expect(q).toHaveProperty('correctAnswer');
      expect(typeof q.correctAnswer).toBe('string');
      expect(q.options).toContain(q.correctAnswer);

      expect(q).toHaveProperty('funFact');
      expect(typeof q.funFact).toBe('string');
      expect(q.funFact.length).toBeGreaterThan(0);

      expect(q).toHaveProperty('imageReference');
      expect(typeof q.imageReference).toBe('string');
      expect(q.imageReference.length).toBeGreaterThan(0);
    });
  });

  test('should cover all required dinosaurs with at least 3 questions each', () => {
    const counts = {};
    expectedDinosaurs.forEach(d => counts[d] = 0);

    questions.forEach(q => {
      let dino = q.dinosaur;
      if (!dino) {
        dino = expectedDinosaurs.find(d => q.statement.includes(d) || (q.funFact && q.funFact.includes(d)));
      }
      if (dino && counts.hasOwnProperty(dino)) {
        counts[dino]++;
      }
    });

    expectedDinosaurs.forEach(d => {
      expect(counts[d]).toBeGreaterThanOrEqual(3);
    });
  });
});