const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });
const schema = require('../src/schemas/question.schema.json');
const seedData = require('../src/data/questions.seed.json');

const validate = ajv.compile(schema);

describe('TRIOFSND-8: Questions Seed Data', () => {
  it('should load the seed data file', () => {
    expect(seedData).toBeDefined();
    expect(Array.isArray(seedData)).toBe(true);
  });

  it('should contain exactly 30 questions', () => {
    expect(seedData.length).toBe(30);
  });

  it('should have every question conform to the schema', () => {
    seedData.forEach((question, index) => {
      const valid = validate(question);
      if (!valid) {
        const errors = validate.errors.map(e => `${e.instancePath} ${e.message}`).join('; ');
        throw new Error(`Question at index ${index} is invalid: ${errors}`);
      }
      expect(valid).toBe(true);
    });
  });

  it('should have a statement for each question', () => {
    seedData.forEach((q, i) => {
      expect(q.statement).toBeDefined();
      expect(typeof q.statement).toBe('string');
      expect(q.statement.length).toBeGreaterThan(0);
    });
  });

  it('should have exactly 3 options per question', () => {
    seedData.forEach((q, i) => {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBe(3);
      q.options.forEach(opt => {
        expect(typeof opt).toBe('string');
        expect(opt.length).toBeGreaterThan(0);
      });
    });
  });

  it('should have a correctIndex between 0 and 2 for each question', () => {
    seedData.forEach((q, i) => {
      expect(Number.isInteger(q.correctIndex)).toBe(true);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(2);
    });
  });

  it('should have a dinoId for each question', () => {
    seedData.forEach((q, i) => {
      expect(q.dinoId).toBeDefined();
      expect(typeof q.dinoId).toBe('string');
      expect(q.dinoId.length).toBeGreaterThan(0);
    });
  });

  it('should have a funFact for each question', () => {
    seedData.forEach((q, i) => {
      expect(q.funFact).toBeDefined();
      expect(typeof q.funFact).toBe('string');
      expect(q.funFact.length).toBeGreaterThan(0);
    });
  });

  it('should have an image for each question', () => {
    seedData.forEach((q, i) => {
      expect(q.image).toBeDefined();
      expect(typeof q.image).toBe('string');
      expect(q.image.length).toBeGreaterThan(0);
    });
  });

  it('should have unique dinoIds across all questions', () => {
    const dinoIds = seedData.map(q => q.dinoId);
    const uniqueIds = new Set(dinoIds);
    expect(uniqueIds.size).toBe(dinoIds.length);
  });

  it('should have unique statements across all questions', () => {
    const statements = seedData.map(q => q.statement);
    const uniqueStatements = new Set(statements);
    expect(uniqueStatements.size).toBe(statements.length);
  });

  it('should have options that are unique within each question', () => {
    seedData.forEach((q, i) => {
      const uniqueOptions = new Set(q.options);
      expect(uniqueOptions.size).toBe(q.options.length);
    });
  });

  it('should have the correct option at the correctIndex position', () => {
    // This is a sanity check that correctIndex points to a valid option
    seedData.forEach((q, i) => {
      expect(q.options[q.correctIndex]).toBeDefined();
      expect(typeof q.options[q.correctIndex]).toBe('string');
      expect(q.options[q.correctIndex].length).toBeGreaterThan(0);
    });
  });
});
