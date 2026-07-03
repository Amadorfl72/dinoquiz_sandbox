const fs = require('fs');
const path = require('path');

const QUESTIONS_JSON_PATH = path.resolve(__dirname, '../src/assets/questions.json');

let rawData;
let questions;

beforeAll(() => {
  rawData = fs.readFileSync(QUESTIONS_JSON_PATH, 'utf-8');
  const parsed = JSON.parse(rawData);
  questions = Array.isArray(parsed) ? parsed : parsed.questions;
});

describe('TRIOFSND-24: Local questions JSON fun facts', () => {
  test('questions.json file exists and is valid JSON', () => {
    expect(() => JSON.parse(rawData)).not.toThrow();
  });

  test('questions is an array', () => {
    expect(Array.isArray(questions)).toBe(true);
  });

  test('there are exactly 30 questions', () => {
    expect(questions.length).toBe(30);
  });

  test('every question has a fun_fact property', () => {
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

  test('fun_fact text is appropriate for ages 6-9 (no overly long words)', () => {
    questions.forEach((q, idx) => {
      const words = q.fun_fact.text.split(/\s+/).filter(w => w.length > 0);
      words.forEach((word, wIdx) => {
        const cleaned = word.replace(/[^a-zA-Z]/g, '');
        if (cleaned.length > 0) {
          expect(cleaned.length).toBeLessThanOrEqual(12);
        }
      });
    });
  });

  test('fun_fact text does not contain inappropriate words', () => {
    const inappropriateWords = [
      'violence', 'violent', 'kill', 'killed', 'kills', 'killing',
      'blood', 'bloody', 'death', 'dead', 'die', 'died', 'dies', 'dying',
      'murder', 'weapon', 'weapons', 'gun', 'guns', 'knife', 'bomb',
      'war', 'fight', 'fighting', 'hate', 'stupid', 'idiot', 'dumb',
      'drugs', 'alcohol', 'beer', 'wine', 'cigarette', 'smoke', 'smoking',
      'hell', 'damn', 'crap', 'sexy', 'naked', 'nude', 'sex',
      'terrorist', 'terrorism', 'bomb', 'shoot', 'shooting', 'stab'
    ];
    questions.forEach((q, idx) => {
      const lowerText = q.fun_fact.text.toLowerCase();
      inappropriateWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        expect(lowerText).not.toMatch(regex);
      });
    });
  });

  test('fun_fact text is reasonably short (max 300 characters)', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact.text.length).toBeLessThanOrEqual(300);
    });
  });

  test('fun_fact text has at least 10 characters', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact.text.trim().length).toBeGreaterThanOrEqual(10);
    });
  });

  test('fun_fact text ends with proper punctuation', () => {
    questions.forEach((q, idx) => {
      const lastChar = q.fun_fact.text.trim().slice(-1);
      expect(['.', '!', '?']).toContain(lastChar);
    });
  });

  test('image_path has a valid image file extension', () => {
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    questions.forEach((q, idx) => {
      const ext = path.extname(q.fun_fact.image_path).toLowerCase();
      expect(validExtensions).toContain(ext);
    });
  });

  test('image_path starts with a valid prefix', () => {
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

  test('each question retains a question, prompt, or text property', () => {
    questions.forEach((q, idx) => {
      const hasQuestion = q.hasOwnProperty('question') ||
                          q.hasOwnProperty('prompt') ||
                          q.hasOwnProperty('text');
      expect(hasQuestion).toBe(true);
    });
  });

  test('no fun_fact text duplicates a question text', () => {
    const questionTexts = questions.map(q => {
      const qt = q.question || q.prompt || q.text || '';
      return qt.toLowerCase().trim();
    });
    questions.forEach((q, idx) => {
      const factText = q.fun_fact.text.toLowerCase().trim();
      expect(questionTexts).not.toContain(factText);
    });
  });

  test('fun_fact text does not exceed a 5th grade reading level (avg word length check)', () => {
    questions.forEach((q, idx) => {
      const words = q.fun_fact.text.split(/\s+/).filter(w => w.length > 0);
      const totalChars = words.reduce((sum, w) => sum + w.length, 0);
      const avgWordLength = totalChars / words.length;
      expect(avgWordLength).toBeLessThanOrEqual(8);
    });
  });

  test('fun_fact text does not contain more than 3 sentences', () => {
    questions.forEach((q, idx) => {
      const sentences = q.fun_fact.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(3);
    });
  });
});
