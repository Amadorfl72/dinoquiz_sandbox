const Ajv = require('ajv');

const schema = require('../schema/question.schema.json');
const seedData = require('../seed/questions.seed.json');

describe('TRIOFSND-8: Questions JSON Schema and Seed Data', () => {
  let ajv;
  let validate;

  beforeAll(() => {
    ajv = new Ajv();
    validate = ajv.compile(schema);
  });

  test('Schema should be defined and have required properties', () => {
    expect(schema).toBeDefined();
    expect(schema.properties.statement).toBeDefined();
    expect(schema.properties.options).toBeDefined();
    expect(schema.properties.correctIndex).toBeDefined();
    expect(schema.properties.dinoId).toBeDefined();
    expect(schema.properties.funFact).toBeDefined();
    expect(schema.properties.image).toBeDefined();
    expect(schema.required).toEqual(
      expect.arrayContaining(['statement', 'options', 'correctIndex', 'dinoId', 'funFact', 'image'])
    );
  });

  test('Schema options should be an array of 3 strings', () => {
    expect(schema.properties.options.type).toBe('array');
    expect(schema.properties.options.minItems).toBe(3);
    expect(schema.properties.options.maxItems).toBe(3);
    expect(schema.properties.options.items.type).toBe('string');
  });

  test('Schema correctIndex should be an integer between 0 and 2', () => {
    expect(schema.properties.correctIndex.type).toBe('integer');
    expect(schema.properties.correctIndex.minimum).toBe(0);
    expect(schema.properties.correctIndex.maximum).toBe(2);
  });

  test('Seed data should contain exactly 30 questions', () => {
    expect(Array.isArray(seedData)).toBe(true);
    expect(seedData.length).toBe(30);
  });

  test('Every seed question should be valid against the schema', () => {
    seedData.forEach((question, index) => {
      const valid = validate(question);
      if (!valid) {
        console.error(`Validation errors for question at index ${index}:`, validate.errors);
      }
      expect(valid).toBe(true);
    });
  });
});
