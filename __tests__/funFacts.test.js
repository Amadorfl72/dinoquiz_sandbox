const fs = require('fs');
const path = require('path');

const QUESTIONS_JSON_PATH = path.resolve(__dirname, '../data/questions.json');

let rawData;
let questions;

beforeAll(() => {
  rawData = fs.readFileSync(QUESTIONS_JSON_PATH, 'utf-8');
  const parsed = JSON.parse(rawData);
  questions = Array.isArray(parsed) ? parsed : parsed.questions;
});

describe('TRIOFSND-24: Local questions JSON with fun facts', () => {
  test('questions.json file exists', () => {
    expect(fs.existsSync(QUESTIONS_JSON_PATH)).toBe(true);
  });

  test('file contains valid JSON', () => {
    expect(() => JSON.parse(rawData)).not.toThrow();
  });

  test('there are exactly 30 questions', () => {
    expect(questions.length).toBe(30);
  });

  test('every question has a fun_fact object', () => {
    questions.forEach((q, idx) => {
      expect(q).toHaveProperty('fun_fact');
      expect(typeof q.fun_fact).toBe('object');
      expect(q.fun_fact).not.toBeNull();
    });
  });

  test('every fun_fact has a text property that is a non-empty string', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact).toHaveProperty('text');
      expect(typeof q.fun_fact.text).toBe('string');
      expect(q.fun_fact.text.trim().length).toBeGreaterThan(0);
    });
  });

  test('every fun_fact has an image_path property that is a non-empty string', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact).toHaveProperty('image_path');
      expect(typeof q.fun_fact.image_path).toBe('string');
      expect(q.fun_fact.image_path.trim().length).toBeGreaterThan(0);
    });
  });

  test('every fun_fact text is reasonably short (max 300 characters)', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact.text.length).toBeLessThanOrEqual(300);
    });
  });

  test('every fun_fact text is unique', () => {
    const texts = questions.map(q => q.fun_fact.text);
    const uniqueTexts = new Set(texts);
    expect(uniqueTexts.size).toBe(texts.length);
  });

  test('every fun_fact image_path is unique', () => {
    const imagePaths = questions.map(q => q.fun_fact.image_path);
    const uniquePaths = new Set(imagePaths);
    expect(uniquePaths.size).toBe(imagePaths.length);
  });

  test('image_path values have a valid image file extension', () => {
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    questions.forEach((q, idx) => {
      const ext = path.extname(q.fun_fact.image_path).toLowerCase();
      expect(validExtensions).toContain(ext);
    });
  });

  test('fun_fact text does not contain inappropriate language for children', () => {
    const inappropriateWords = [
      'violence', 'violent', 'kill', 'killed', 'killing', 'murder',
      'blood', 'gore', 'weapon', 'gun', 'drugs', 'alcohol',
      'drunk', 'sex', 'sexual', 'profanity', 'damn', 'hell',
      'stupid', 'hate', 'death', 'dead', 'die', 'died', 'dying',
      'war', 'fight', 'fighting', 'attack', 'attacked',
      'terror', 'terrorist', 'bomb', 'shoot', 'shot',
      'abuse', 'abused', 'crime', 'criminal', 'prison',
      'drug', 'beer', 'wine', 'liquor', 'cigarette', 'smoke', 'smoking'
    ];
    questions.forEach((q, idx) => {
      const lowerText = q.fun_fact.text.toLowerCase();
      inappropriateWords.forEach(word => {
        expect(lowerText).not.toContain(word);
      });
    });
  });

  test('fun_fact text vocabulary is appropriate for ages 6-9 (no overly complex words)', () => {
    const complexWords = [
      'phenomenon', 'hypothesis', 'theoretical', 'quantum',
      'metamorphosis', 'photosynthesis', 'biodiversity',
      'archaeological', 'paleontological', 'anthropological',
      'infrastructure', 'bureaucracy', 'institutionalized',
      'constitutional', 'philosophical', 'psychological',
      'sociological', 'geopolitical', 'macroeconomic',
      'microeconomic', 'epidemiological', 'biotechnology',
      'nanotechnology', 'cryptocurrency', 'blockchain',
      'algorithmic', 'computational', 'statistical',
      'methodological', 'conceptualization', 'operationalization',
      'institutionalization', 'commercialization', 'privatization',
      'nationalization', 'globalization', 'industrialization',
      'urbanization', 'modernization', 'standardization',
      'optimization', 'maximization', 'minimization',
      'generalization', 'specialization', 'categorization',
      'classification', 'identification', 'verification',
      'authentication', 'authorization', 'encryption',
      'decryption', 'compression', 'decompression'
    ];
    questions.forEach((q, idx) => {
      const lowerText = q.fun_fact.text.toLowerCase();
      complexWords.forEach(word => {
        expect(lowerText).not.toContain(word);
      });
    });
  });

  test('fun_fact text does not contain URLs or HTML tags', () => {
    const urlPattern = /https?:\/\/.+/;
    const htmlTagPattern = /<[^>]+>/;
    questions.forEach((q, idx) => {
      expect(urlPattern.test(q.fun_fact.text)).toBe(false);
      expect(htmlTagPattern.test(q.fun_fact.text)).toBe(false);
    });
  });

  test('fun_fact text ends with proper punctuation', () => {
    questions.forEach((q, idx) => {
      const lastChar = q.fun_fact.text.trim().slice(-1);
      expect(['.', '!', '?']).toContain(lastChar);
    });
  });

  test('fun_fact object does not contain unexpected extra keys', () => {
    questions.forEach((q, idx) => {
      const allowedKeys = ['text', 'image_path'];
      const actualKeys = Object.keys(q.fun_fact);
      actualKeys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });
    });
  });

  test('all 30 questions have fun_fact (none missing)', () => {
    const withFunFact = questions.filter(q => q.fun_fact && typeof q.fun_fact === 'object');
    expect(withFunFact.length).toBe(30);
  });

  test('fun_fact text has at least 10 characters (meaningful content)', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact.text.trim().length).toBeGreaterThanOrEqual(10);
    });
  });

  test('image_path does not contain spaces or special characters that break paths', () => {
    questions.forEach((q, idx) => {
      expect(q.fun_fact.image_path).not.toMatch(/\s/);
    });
  });
});
