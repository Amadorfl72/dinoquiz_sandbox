const fs = require('fs');
const path = require('path');

const QUESTIONS_JSON_PATH = path.resolve(__dirname, '../data/questions.json');

let questions;

beforeAll(() => {
  const raw = fs.readFileSync(QUESTIONS_JSON_PATH, 'utf-8');
  questions = JSON.parse(raw);
});

// A curated blocklist of words deemed too advanced / inappropriate for ages 6-9.
const INAPPROPRIATE_WORDS = [
  'eliminate', 'comprehensive', 'fundamental', 'consequently',
  'nevertheless', 'whereas', 'notwithstanding', 'aforementioned',
  'phenomenon', 'hypothetical', 'subsequently', 'nevertheless',
  'correspondence', 'ostensibly', 'surreptitiously', 'inextricably',
  'disproportionate', 'idiosyncratic', 'anachronism', 'obfuscate',
  'magnanimous', 'perfunctory', 'sycophant', 'recalcitrant',
];

describe('TRIOFSND-24: Fun fact vocabulary is appropriate for ages 6-9', () => {
  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact text does not contain inappropriate vocabulary',
    (_, index) => {
      const { text } = questions[index].fun_fact;
      const lowerText = text.toLowerCase();
      const found = INAPPROPRIATE_WORDS.filter(w => lowerText.includes(w));
      expect(found).toEqual([]);
    }
  );

  test.each([...Array(30).keys()].map(i => [`question #${i + 1}`, i]))(
    '%s fun_fact text has 10 words or fewer on average per sentence',
    (_, index) => {
      const { text } = questions[index].fun_fact;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThan(0);
      const avgWords = sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) / sentences.length;
      expect(avgWords).toBeLessThanOrEqual(15);
    }
  );

  test('all fun fact texts are unique', () => {
    const texts = questions.map(q => q.fun_fact.text.trim().toLowerCase());
    const unique = new Set(texts);
    expect(unique.size).toBe(texts.length);
  });

  test('all fun fact image_paths are unique', () => {
    const paths = questions.map(q => q.fun_fact.image_path.trim().toLowerCase());
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });
});
