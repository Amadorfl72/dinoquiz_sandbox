const fs = require('fs');
const path = require('path');

const questionsPath = path.join(__dirname, '..', 'data', 'questions.json');
let questions = [];

beforeAll(() => {
  const rawData = fs.readFileSync(questionsPath, 'utf-8');
  questions = JSON.parse(rawData);
});

describe('TRIOFSND-24: Local questions JSON with 30 fun facts', () => {
  test('should have exactly 30 questions', () => {
    expect(questions.length).toBe(30);
  });

  test('each question should have a fun_fact object', () => {
    questions.forEach((q, index) => {
      expect(q.fun_fact).toBeDefined();
      expect(typeof q.fun_fact).toBe('object');
      expect(q.fun_fact).not.toBeNull();
    });
  });

  test('fun_fact should contain short_text and image_path', () => {
    questions.forEach((q, index) => {
      expect(q.fun_fact.short_text).toBeDefined();
      expect(typeof q.fun_fact.short_text).toBe('string');
      expect(q.fun_fact.short_text.length).toBeGreaterThan(0);

      expect(q.fun_fact.image_path).toBeDefined();
      expect(typeof q.fun_fact.image_path).toBe('string');
      expect(q.fun_fact.image_path.length).toBeGreaterThan(0);
    });
  });

  test('fun_fact short_text should be appropriate for 6-9 years (length and basic vocabulary)', () => {
    const complexWords = ['quantum', 'epistemological', 'mitochondria', 'bureaucracy', 'phenomenon', 'infrastructure'];
    questions.forEach((q, index) => {
      const text = q.fun_fact.short_text.toLowerCase();
      // Check length is reasonable for a short fact
      expect(q.fun_fact.short_text.length).toBeLessThanOrEqual(150);
      // Check against a blacklist of complex words
      complexWords.forEach(word => {
        expect(text).not.toContain(word);
      });
    });
  });
});
