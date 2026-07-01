const fs = require('fs');
const path = require('path');

const QUESTIONS_JSON_PATH = path.resolve(__dirname, '../data/questions.json');

let questions;

beforeAll(() => {
  const raw = fs.readFileSync(QUESTIONS_JSON_PATH, 'utf-8');
  questions = JSON.parse(raw);
});

describe('TRIOFSND-24: Fun fact object structure', () => {
  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact contains exactly the expected keys: text and image_path',
    (_, index) => {
      const keys = Object.keys(questions[index].fun_fact).sort();
      expect(keys).toEqual(['image_path', 'text'].sort());
    }
  );

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact does not contain null or undefined values',
    (_, index) => {
      const { fun_fact } = questions[index];
      expect(fun_fact.text).not.toBeNull();
      expect(fun_fact.text).not.toBeUndefined();
      expect(fun_fact.image_path).not.toBeNull();
      expect(fun_fact.image_path).not.toBeUndefined();
    }
  );

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact text has no leading or trailing whitespace',
    (_, index) => {
      const { text } = questions[index].fun_fact;
      expect(text).toBe(text.trim());
    }
  );

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact image_path has no leading or trailing whitespace',
    (_, index) => {
      const { image_path } = questions[index].fun_fact;
      expect(image_path).toBe(image_path.trim());
    }
  );

  test('JSON file is parseable and contains no duplicate question IDs', () => {
    const ids = questions.map(q => q.id).filter(id => id !== undefined);
    if (ids.length > 0) {
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });
});
