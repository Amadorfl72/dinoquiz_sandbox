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

  test('there are exactly 30 questions', () => {
    expect(questions.length).toBe(30);
  });

  test('each question retains a question or prompt property', () => {
    questions.forEach((q, idx) => {
      const hasQuestion = q.hasOwnProperty('question') || q.hasOwnProperty('prompt') || q.hasOwnProperty('text');
      expect(hasQuestion).toBe(true);
    });
  });

  test('each question has a fun_fact object', () => {
    questions.forEach((q, idx) => {
      expect(q).toHaveProperty('fun_fact');
      expect(typeof q.fun_fact).toBe('object');
      expect(q.fun_fact).not.toBeNull();
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

  test('image_path starts with a valid prefix (/, ./, assets/, or images/)', () => {
    questions.forEach((q, idx) => {
      const imgPath = q.fun_fact.image_path;
      const validStart = imgPath.startsWith('/') ||
                         imgPath.startsWith('./') ||
                         imgPath.startsWith('assets/') ||
                         imgPath.startsWith('images/');
      expect(validStart).toBe(true);
    });
  });

  test('fun_fact has only text and image_path keys', () => {
    const allowedKeys = ['text', 'image_path'];
    questions.forEach((q, idx) => {
      const actualKeys = Object.keys(q.fun_fact);
      actualKeys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });
    });
  });

  test('all fun_fact texts are unique', () => {
    const texts = questions.map(q => q.fun_fact.text);
    const uniqueTexts = new Set(texts);
    expect(uniqueTexts.size).toBe(texts.length);
  });

  test('all fun_fact image_paths are unique', () => {
    const imagePaths = questions.map(q => q.fun_fact.image_path);
    const uniquePaths = new Set(imagePaths);
    expect(uniquePaths.size).toBe(imagePaths.length);
  });

  test('every fun_fact text is a non-empty string', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact).toHaveProperty('text');
      expect(typeof q.fun_fact.text).toBe('string');
      expect(q.fun_fact.text.trim().length).toBeGreaterThan(0);
    });
  });

  test('every fun_fact image_path is a non-empty string', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact).toHaveProperty('image_path');
      expect(typeof q.fun_fact.image_path).toBe('string');
      expect(q.fun_fact.image_path.trim().length).toBeGreaterThan(0);
    });
  });

  test('image_path values have a valid image file extension', () => {
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    questions.forEach((q, idx) => {
      const ext = path.extname(q.fun_fact.image_path).toLowerCase();
      expect(validExtensions).toContain(ext);
    });
  });

  test('fun_fact text ends with proper punctuation', () => {
    questions.forEach((q, idx) => {
      const lastChar = q.fun_fact.text.trim().slice(-1);
      expect(['.', '!', '?']).toContain(lastChar);
    });
  });

  test('fun_fact text has at least 10 characters (meaningful content)', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact.text.trim().length).toBeGreaterThanOrEqual(10);
    });
  });

  test('fun_fact text is reasonably short (max 300 characters)', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact.text.length).toBeLessThanOrEqual(300);
    });
  });
});
