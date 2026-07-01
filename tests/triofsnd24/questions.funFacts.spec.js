const fs = require('fs');
const path = require('path');

const QUESTIONS_JSON_PATH = path.resolve(__dirname, '../data/questions.json');

let questions;

beforeAll(() => {
  const raw = fs.readFileSync(QUESTIONS_JSON_PATH, 'utf-8');
  questions = JSON.parse(raw);
});

describe('TRIOFSND-24: Questions JSON has fun facts', () => {
  test('questions.json file exists and is valid JSON', () => {
    expect(fs.existsSync(QUESTIONS_JSON_PATH)).toBe(true);
    expect(Array.isArray(questions)).toBe(true);
  });

  test('there are exactly 30 questions', () => {
    expect(questions).toHaveLength(30);
  });

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s has a fun_fact object',
    (_, index) => {
      const q = questions[index];
      expect(q).toBeDefined();
      expect(q.fun_fact).toBeDefined();
      expect(typeof q.fun_fact).toBe('object');
      expect(q.fun_fact).not.toBeNull();
    }
  );

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact has a non-empty text field of type string',
    (_, index) => {
      const { fun_fact } = questions[index];
      expect(typeof fun_fact.text).toBe('string');
      expect(fun_fact.text.trim().length).toBeGreaterThan(0);
    }
  );

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact text is 200 characters or fewer',
    (_, index) => {
      const { fun_fact } = questions[index];
      expect(fun_fact.text.length).toBeLessThanOrEqual(200);
    }
  );

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact has a non-empty image_path field of type string',
    (_, index) => {
      const { fun_fact } = questions[index];
      expect(typeof fun_fact.image_path).toBe('string');
      expect(fun_fact.image_path.trim().length).toBeGreaterThan(0);
    }
  );

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact image_path has a valid image extension',
    (_, index) => {
      const { image_path } = questions[index].fun_fact;
      expect(image_path).toMatch(/\.(png|jpg|jpeg|gif|svg|webp)$/i);
    }
  );
});
