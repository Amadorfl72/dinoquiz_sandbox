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

  it('expected unique image_paths count to equal total count', () => {
    const imagePaths = questions.map((q) => q.image_path);
    const uniqueImagePaths = new Set(imagePaths);
    expect(uniqueImagePaths.size).toBe(30);
    expect(imagePaths.length).toBe(30);
  });

  it('does not reuse the same dinosaur fun_fact image for different questions', () => {
    const knownDuplicates = [
      'assets/images/trex_fun_fact.png',
      'assets/images/triceratops_fun_fact.png',
      'assets/images/stegosaurus_fun_fact.png',
      'assets/images/velociraptor_fun_fact.png',
      'assets/images/brachiosaurus_fun_fact.png',
      'assets/images/ankylosaurus_fun_fact.png',
      'assets/images/pteranodon_fun_fact.png',
    ];
    const imagePaths = questions.map((q) => q.image_path);
    knownDuplicates.forEach((path) => {
      const occurrences = imagePaths.filter((p) => p === path).length;
      expect(occurrences).toBeLessThanOrEqual(1);
    });
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
