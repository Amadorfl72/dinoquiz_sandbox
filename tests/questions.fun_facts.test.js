const fs = require('fs');
const path = require('path');

const QUESTIONS_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'questions.json');

let questions = [];

beforeAll(() => {
  const fileContent = fs.readFileSync(QUESTIONS_FILE_PATH, 'utf-8');
  questions = JSON.parse(fileContent);
});

describe('TRIOFSND-24: Local questions JSON fun facts', () => {
  test('should have exactly 30 questions', () => {
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(30);
  });

  test('each question should have a fun_fact object', () => {
    questions.forEach((q, index) => {
      expect(q).toHaveProperty('fun_fact');
      expect(typeof q.fun_fact).toBe('object');
      expect(q.fun_fact).not.toBeNull();
    });
  });

  test('each fun_fact should contain short text and image path', () => {
    questions.forEach((q, index) => {
      expect(q.fun_fact).toHaveProperty('text');
      expect(q.fun_fact).toHaveProperty('image');
      
      expect(typeof q.fun_fact.text).toBe('string');
      expect(q.fun_fact.text.length).toBeGreaterThan(0);
      
      expect(typeof q.fun_fact.image).toBe('string');
      expect(q.fun_fact.image.length).toBeGreaterThan(0);
      // Basic check for image extension
      expect(q.fun_fact.image).toMatch(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
    });
  });

  test('fun_fact text should be appropriate for 6-9 years old (vocabulary and length)', () => {
    questions.forEach((q, index) => {
      const text = q.fun_fact.text;
      const words = text.split(/\s+/);
      
      // Check overall length is not too long for a short fun fact
      expect(words.length).toBeLessThanOrEqual(30);
      
      // Check for overly complex words (max 10 characters per word as a heuristic)
      words.forEach(word => {
        const cleanedWord = word.replace(/[^a-zA-Z]/g, '');
        if (cleanedWord.length > 0) {
          expect(cleanedWord.length).toBeLessThanOrEqual(10);
        }
      });
    });
  });
});
