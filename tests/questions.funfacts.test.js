const fs = require('fs');
const path = require('path');

const questionsFilePath = path.join(__dirname, '../src/assets/questions.json');

let questions = [];

describe('TRIOFSND-24: Local questions JSON with fun facts', () => {
  beforeAll(() => {
    const fileData = fs.readFileSync(questionsFilePath, 'utf-8');
    questions = JSON.parse(fileData);
  });

  test('should have exactly 10 questions', () => {
    expect(questions.length).toBe(10);
  });

  test('each question should have a fun_fact object', () => {
    questions.forEach((q, index) => {
      expect(q).toHaveProperty('fun_fact');
      expect(typeof q.fun_fact).toBe('object');
      expect(q.fun_fact).not.toBeNull();
    });
  });

  test('each fun_fact should have short text and image path', () => {
    questions.forEach((q, index) => {
      expect(q.fun_fact).toHaveProperty('text');
      expect(q.fun_fact).toHaveProperty('image_path');
      expect(typeof q.fun_fact.text).toBe('string');
      expect(typeof q.fun_fact.image_path).toBe('string');
      expect(q.fun_fact.text.length).toBeGreaterThan(0);
      expect(q.fun_fact.image_path.length).toBeGreaterThan(0);
    });
  });

  test('fun_fact text should be appropriate for 6-9 years (short and simple)', () => {
    const complexWords = ['quantum', 'phenomenon', 'bureaucracy', 'metamorphosis', 'photosynthesis', 'mitochondria', 'ubiquitous', 'paradigm'];
    questions.forEach((q, index) => {
      const text = q.fun_fact.text.toLowerCase();
      // Check length is reasonable for a short fact
      expect(q.fun_fact.text.length).toBeLessThanOrEqual(200);
      // Check against a blacklist of overly complex words
      complexWords.forEach(word => {
        expect(text).not.toContain(word);
      });
    });
  });
});