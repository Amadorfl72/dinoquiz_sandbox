const fs = require('fs');
const path = require('path');

const QUESTIONS_FILE = path.resolve(__dirname, '../src/data/questions.json');

const COMPLEX_WORDS = [
  'phenomenon', 'hypothesis', 'metamorphosis', 'photosynthesis',
  'biodiversity', 'archaeological', 'paleontologist', 'stratosphere',
  'circumference', 'constitutional', 'extraordinary', 'sophisticated',
  'comprehensive', 'fundamental', 'theoretical', 'philosophical',
  'characteristic', 'demonstrate', 'consequence', 'significant',
  'approximately', 'corresponding', 'environment', 'infrastructure',
  'international', 'legislation', 'maintenance', 'negotiation',
  'organization', 'participation', 'responsibility', 'technology',
  'unfortunately', 'vocabulary', 'magnificent', 'extraordinary'
];

function loadQuestions() {
  const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function fleschKincaidGrade(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
}

describe('TRIOFSND-24: Local questions JSON fun facts', () => {
  let questions;

  beforeAll(() => {
    questions = loadQuestions();
  });

  test('questions JSON file exists and is parseable', () => {
    expect(() => loadQuestions()).not.toThrow();
    expect(Array.isArray(questions)).toBe(true);
  });

  test('contains exactly 30 questions', () => {
    expect(questions.length).toBe(30);
  });

  test('every question has a fun_fact object', () => {
    questions.forEach((q, idx) => {
      expect(q).toHaveProperty('fun_fact');
      expect(typeof q.fun_fact).toBe('object');
      expect(q.fun_fact).not.toBeNull();
    });
  });

  test('every fun_fact has a non-empty text string', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact).toHaveProperty('text');
      expect(typeof q.fun_fact.text).toBe('string');
      expect(q.fun_fact.text.trim().length).toBeGreaterThan(0);
    });
  });

  test('every fun_fact has a non-empty image_path string', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact).toHaveProperty('image_path');
      expect(typeof q.fun_fact.image_path).toBe('string');
      expect(q.fun_fact.image_path.trim().length).toBeGreaterThan(0);
    });
  });

  test('image_path values are valid relative paths with image extensions', () => {
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    questions.forEach((q, idx) => {
      const img = q.fun_fact.image_path;
      expect(img).toMatch(/^\.?\.?\/?[\w\-/]+\.(png|jpg|jpeg|gif|webp|svg)$/i);
      const hasValidExt = validExtensions.some(ext => img.toLowerCase().endsWith(ext));
      expect(hasValidExt).toBe(true);
    });
  });

  test('fun_fact text is short (under 300 characters)', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact.text.length).toBeLessThanOrEqual(300);
    });
  });

  test('fun_fact text does not contain complex/inappropriate vocabulary', () => {
    questions.forEach((q, idx) => {
      const lowerText = q.fun_fact.text.toLowerCase();
      const found = COMPLEX_WORDS.filter(w => lowerText.includes(w));
      expect({
        questionIndex: idx,
        complexWordsFound: found
      }).toEqual({
        questionIndex: idx,
        complexWordsFound: []
      });
    });
  });

  test('fun_fact text reading level is appropriate for ages 6-9 (grade <= 5)', () => {
    questions.forEach((q, idx) => {
      const grade = fleschKincaidGrade(q.fun_fact.text);
      expect({
        questionIndex: idx,
        gradeLevel: grade
      }).toEqual({
        questionIndex: idx,
        gradeLevel: expect.any(Number)
      });
      expect(grade).toBeLessThanOrEqual(5);
    });
  });

  test('fun_fact text average word length is reasonable for young readers (<= 6 chars)', () => {
    questions.forEach((q, idx) => {
      const words = q.fun_fact.text.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
      const avgLen = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0) / words.length;
      expect(avgLen).toBeLessThanOrEqual(6);
    });
  });

  test('fun_fact text contains no words longer than 12 characters', () => {
    questions.forEach((q, idx) => {
      const words = q.fun_fact.text.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 0);
      const longWords = words.filter(w => w.length > 12);
      expect({
        questionIndex: idx,
        longWords
      }).toEqual({
        questionIndex: idx,
        longWords: []
      });
    });
  });

  test('all fun_fact texts are unique', () => {
    const texts = questions.map(q => q.fun_fact.text.trim());
    const unique = new Set(texts);
    expect(unique.size).toBe(texts.length);
  });

  test('all fun_fact image_paths are unique', () => {
    const paths = questions.map(q => q.fun_fact.image_path.trim());
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  test('fun_fact object contains only expected keys (text, image_path)', () => {
    questions.forEach((q, idx) => {
      const keys = Object.keys(q.fun_fact).sort();
      expect(keys).toEqual(['image_path', 'text']);
    });
  });
});