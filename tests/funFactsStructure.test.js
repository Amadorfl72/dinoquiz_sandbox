const questions = require('../src/data/questions.json').questions;

describe('TRIOFSND-24: Fun facts structure validation', () => {
  it('should load questions array from JSON', () => {
    expect(questions).toBeDefined();
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('should have 30 fun facts', () => {
    expect(questions.length).toBe(30);
  });

  it('all fun_fact image_paths are unique', () => {
    const imagePaths = questions.map((q) => q.image_path);
    const uniqueSet = new Set(imagePaths);
    expect(uniqueSet.size).toBe(imagePaths.length);
  });

  it('each question has required fields', () => {
    questions.forEach((q, index) => {
      expect(q).toHaveProperty('id', `Question at index ${index} missing id`);
      expect(q).toHaveProperty('question', `Question at index ${index} missing question`);
      expect(q).toHaveProperty('options', `Question at index ${index} missing options`);
      expect(q).toHaveProperty('correct_answer', `Question at index ${index} missing correct_answer`);
      expect(q).toHaveProperty('fun_fact', `Question at index ${index} missing fun_fact`);
      expect(q).toHaveProperty('image_path', `Question at index ${index} missing image_path`);
    });
  });

  it('image_paths follow a valid naming pattern', () => {
    const validPattern = /^assets\/images\/[a-z_]+_fun_fact_\d+\.png$/;
    questions.forEach((q, index) => {
      expect(q.image_path).toMatch(validPattern);
    });
  });

  it('no two questions share the same image_path', () => {
    const seen = {};
    questions.forEach((q) => {
      const path = q.image_path;
      expect(seen[path]).toBeUndefined();
      seen[path] = true;
    });
  });
});
