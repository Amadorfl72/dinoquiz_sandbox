const questions = require('../src/data/questions.json').questions;

describe('TRIOFSND-24: Local questions JSON with 30 fun facts', () => {
  it('should have exactly 30 questions', () => {
    expect(questions).toBeDefined();
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(30);
  });

  it('every question has an image_path', () => {
    questions.forEach((q) => {
      expect(q).toHaveProperty('image_path');
      expect(typeof q.image_path).toBe('string');
      expect(q.image_path.length).toBeGreaterThan(0);
    });
  });

  it('every fun_fact image_path is unique', () => {
    const imagePaths = questions.map((q) => q.image_path);
    const uniqueImagePaths = new Set(imagePaths);
    expect(uniqueImagePaths.size).toBe(imagePaths.length);
  });

  it('every question has a fun_fact', () => {
    questions.forEach((q) => {
      expect(q).toHaveProperty('fun_fact');
      expect(typeof q.fun_fact).toBe('string');
      expect(q.fun_fact.length).toBeGreaterThan(0);
    });
  });

  it('every question id is unique', () => {
    const ids = questions.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
