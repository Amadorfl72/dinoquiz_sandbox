const Ajv = require('ajv');
const ajv = new Ajv();

// Assuming the schema and seed data are located at these paths
const questionSchema = require('../src/schemas/question.schema.json');
const seedData = require('../src/data/questions.seed.json');

describe('TRIOFSND-8: Questions JSON Schema and Seed Data', () => {
  let validate;

  beforeAll(() => {
    validate = ajv.compile(questionSchema);
  });

  describe('Schema Definition', () => {
    it('should define an object schema', () => {
      expect(questionSchema.type).toBe('object');
    });

    it('should require statement, options, correctIndex, dinoId, funFact, and image', () => {
      expect(questionSchema.required).toEqual(
        expect.arrayContaining(['statement', 'options', 'correctIndex', 'dinoId', 'funFact', 'image'])
      );
    });

    it('should define statement as a string', () => {
      expect(questionSchema.properties.statement.type).toBe('string');
    });

    it('should define options as an array of strings with minItems and maxItems of 3', () => {
      expect(questionSchema.properties.options.type).toBe('array');
      expect(questionSchema.properties.options.items.type).toBe('string');
      expect(questionSchema.properties.options.minItems).toBe(3);
      expect(questionSchema.properties.options.maxItems).toBe(3);
    });

    it('should define correctIndex as an integer with minimum 0 and maximum 2', () => {
      expect(questionSchema.properties.correctIndex.type).toBe('integer');
      expect(questionSchema.properties.correctIndex.minimum).toBe(0);
      expect(questionSchema.properties.correctIndex.maximum).toBe(2);
    });

    it('should define dinoId as a string', () => {
      expect(questionSchema.properties.dinoId.type).toBe('string');
    });

    it('should define funFact as a string', () => {
      expect(questionSchema.properties.funFact.type).toBe('string');
    });

    it('should define image as a string', () => {
      expect(questionSchema.properties.image.type).toBe('string');
    });
  });

  describe('Seed Data', () => {
    it('should be an array', () => {
      expect(Array.isArray(seedData)).toBe(true);
    });

    it('should contain exactly 30 questions', () => {
      expect(seedData.length).toBe(30);
    });

    it('should have every question conform to the schema', () => {
      seedData.forEach((question, index) => {
        const valid = validate(question);
        if (!valid) {
          console.error(`Validation failed for question at index ${index}:`, validate.errors);
        }
        expect(valid).toBe(true);
      });
    });

    it('should have exactly 3 options for each question', () => {
      seedData.forEach((question) => {
        expect(question.options).toHaveLength(3);
      });
    });

    it('should have a correctIndex between 0 and 2 for each question', () => {
      seedData.forEach((question) => {
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThanOrEqual(2);
      });
    });

    it('should have non-empty strings for statement, funFact, and image', () => {
      seedData.forEach((question) => {
        expect(question.statement.length).toBeGreaterThan(0);
        expect(question.funFact.length).toBeGreaterThan(0);
        expect(question.image.length).toBeGreaterThan(0);
      });
    });

    it('should have unique dinoIds for each question', () => {
      const dinoIds = seedData.map(q => q.dinoId);
      const uniqueDinoIds = new Set(dinoIds);
      expect(uniqueDinoIds.size).toBe(30);
    });
  });
});