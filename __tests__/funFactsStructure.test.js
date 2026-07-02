const fs = require('fs');
const path = require('path');

const QUESTIONS_JSON_PATH = path.resolve(__dirname, '../src/assets/questions.json');

function loadQuestions() {
  const raw = fs.readFileSync(QUESTIONS_JSON_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.questions;
}

describe('TRIOFSND-24: Fun fact data integrity', () => {
  const questions = loadQuestions();

  test('each question retains its original id property', () => {
    questions.forEach((q, idx) => {
      expect(q).toHaveProperty('id');
      expect(q.id).toBe(idx + 1);
    });
  });

  test('each question retains a question or prompt property', () => {
    questions.forEach((q, idx) => {
      const hasQuestion = q.hasOwnProperty('question') || q.hasOwnProperty('prompt') || q.hasOwnProperty('text');
      expect(hasQuestion).toBe(true);
    });
  });

  test('fun_fact text does not exceed a 5th grade reading level (avg word length check)', () => {
    questions.forEach((q, idx) => {
      const words = q.fun_fact.text.split(/\s+/).filter(w => w.length > 0);
      const totalChars = words.reduce((sum, w) => sum + w.length, 0);
      const avgWordLength = totalChars / words.length;
      // Average word length above 8 suggests complex vocabulary
      expect(avgWordLength).toBeLessThanOrEqual(8);
    });
  });

  test('fun_fact text does not contain more than 3 sentences', () => {
    questions.forEach((q, idx) => {
      const sentences = q.fun_fact.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(3);
    });
  });

  test('no fun_fact text is a duplicate of another question text', () => {
    const questionTexts = questions.map(q => {
      const qt = q.question || q.prompt || q.text || '';
      return qt.toLowerCase().trim();
    });
    questions.forEach((q, idx) => {
      const factText = q.fun_fact.text.toLowerCase().trim();
      expect(questionTexts).not.toContain(factText);
    });
  });

  test('image_path starts with a valid prefix (/, ./, or assets/)', () => {
    questions.forEach((q, idx) => {
      const imgPath = q.fun_fact.image_path;
      const validStart = imgPath.startsWith('/') ||
                         imgPath.startsWith('./') ||
                         imgPath.startsWith('assets/') ||
                         imgPath.startsWith('images/');
      expect(validStart).toBe(true);
    });
  });
});
