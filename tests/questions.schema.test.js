const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: false });

const SCHEMA_PATH = path.resolve(__dirname, '../src/schemas/question.schema.json');
const SEED_PATH = path.resolve(__dirname, '../src/data/questions.seed.json');

let schema;
let seedData;
let validate;

beforeAll(() => {
  schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  seedData = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  validate = ajv.compile(schema);
});

describe('TRIOFSND-8: Question JSON Schema', () => {
  test('schema file exists', () => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
  });

  test('schema is a valid JSON Schema draft object', () => {
    expect(schema).toHaveProperty('$schema');
    expect(schema).toHaveProperty('type', 'object');
    expect(schema).toHaveProperty('properties');
    expect(schema).toHaveProperty('required');
  });

  test('schema requires statement, options, correctIndex, dinoId, funFact, image', () => {
    const required = schema.required;
    expect(required).toEqual(
      expect.arrayContaining([
        'statement',
        'options',
        'correctIndex',
        'dinoId',
        'funFact',
        'image',
      ])
    );
  });

  test('statement property is a string', () => {
    expect(schema.properties.statement.type).toBe('string');
  });

  test('options property is an array of strings with min/max 3 items', () => {
    const opts = schema.properties.options;
    expect(opts.type).toBe('array');
    expect(opts.items.type).toBe('string');
    expect(opts.minItems).toBe(3);
    expect(opts.maxItems).toBe(3);
  });

  test('correctIndex is an integer between 0 and 2', () => {
    const ci = schema.properties.correctIndex;
    expect(ci.type).toBe('integer');
    expect(ci.minimum).toBe(0);
    expect(ci.maximum).toBe(2);
  });

  test('dinoId is defined in schema', () => {
    expect(schema.properties).toHaveProperty('dinoId');
  });

  test('funFact is a string', () => {
    expect(schema.properties.funFact.type).toBe('string');
  });

  test('image is a string', () => {
    expect(schema.properties.image.type).toBe('string');
  });
});

describe('TRIOFSND-8: Seed Data', () => {
  test('seed file exists', () => {
    expect(fs.existsSync(SEED_PATH)).toBe(true);
  });

  test('seed data contains exactly 30 questions', () => {
    expect(Array.isArray(seedData)).toBe(true);
    expect(seedData.length).toBe(30);
  });

  test('every seed question validates against the schema', () => {
    seedData.forEach((q, idx) => {
      const valid = validate(q);
      if (!valid) {
        throw new Error(
          `Question at index ${idx} failed validation: ${JSON.stringify(validate.errors, null, 2)}`
        );
      }
      expect(valid).toBe(true);
    });
  });

  test('every seed question has a non-empty statement', () => {
    seedData.forEach((q, idx) => {
      expect(typeof q.statement).toBe('string');
      expect(q.statement.trim().length).toBeGreaterThan(0);
    });
  });

  test('every seed question has exactly 3 non-empty options', () => {
    seedData.forEach((q, idx) => {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBe(3);
      q.options.forEach((opt) => {
        expect(typeof opt).toBe('string');
        expect(opt.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('every correctIndex is within bounds of options array', () => {
    seedData.forEach((q, idx) => {
      expect(Number.isInteger(q.correctIndex)).toBe(true);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    });
  });

  test('every seed question has a non-empty funFact', () => {
    seedData.forEach((q, idx) => {
      expect(typeof q.funFact).toBe('string');
      expect(q.funFact.trim().length).toBeGreaterThan(0);
    });
  });

  test('every seed question has a non-empty image', () => {
    seedData.forEach((q, idx) => {
      expect(typeof q.image).toBe('string');
      expect(q.image.trim().length).toBeGreaterThan(0);
    });
  });

  test('every seed question has a dinoId', () => {
    seedData.forEach((q, idx) => {
      expect(q).toHaveProperty('dinoId');
      expect(q.dinoId).not.toBeNull();
      expect(q.dinoId).not.toBe('');
    });
  });

  test('all dinoIds are unique', () => {
    const ids = seedData.map((q) => q.dinoId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('no duplicate statements across seed data', () => {
    const statements = seedData.map((q) => q.statement);
    const unique = new Set(statements);
    expect(unique.size).toBe(statements.length);
  });
});

describe('TRIOFSND-8: Schema rejects invalid data', () => {
  const validQuestion = {
    statement: 'What dinosaur is known for its three horns?',
    options: ['Triceratops', 'Stegosaurus', 'Tyrannosaurus'],
    correctIndex: 0,
    dinoId: 'triceratops',
    funFact: 'Triceratops had up to 400 teeth.',
    image: '/images/triceratops.png',
  };

  test('accepts a valid question', () => {
    expect(validate(validQuestion)).toBe(true);
  });

  test('rejects missing statement', () => {
    const bad = { ...validQuestion };
    delete bad.statement;
    expect(validate(bad)).toBe(false);
  });

  test('rejects missing options', () => {
    const bad = { ...validQuestion };
    delete bad.options;
    expect(validate(bad)).toBe(false);
  });

  test('rejects options with fewer than 3 items', () => {
    const bad = { ...validQuestion, options: ['A', 'B'] };
    expect(validate(bad)).toBe(false);
  });

  test('rejects options with more than 3 items', () => {
    const bad = { ...validQuestion, options: ['A', 'B', 'C', 'D'] };
    expect(validate(bad)).toBe(false);
  });

  test('rejects correctIndex out of range (negative)', () => {
    const bad = { ...validQuestion, correctIndex: -1 };
    expect(validate(bad)).toBe(false);
  });

  test('rejects correctIndex out of range (too high)', () => {
    const bad = { ...validQuestion, correctIndex: 3 };
    expect(validate(bad)).toBe(false);
  });

  test('rejects non-integer correctIndex', () => {
    const bad = { ...validQuestion, correctIndex: 1.5 };
    expect(validate(bad)).toBe(false);
  });

  test('rejects missing dinoId', () => {
    const bad = { ...validQuestion };
    delete bad.dinoId;
    expect(validate(bad)).toBe(false);
  });

  test('rejects missing funFact', () => {
    const bad = { ...validQuestion };
    delete bad.funFact;
    expect(validate(bad)).toBe(false);
  });

  test('rejects missing image', () => {
    const bad = { ...validQuestion };
    delete bad.image;
    expect(validate(bad)).toBe(false);
  });

  test('rejects statement as non-string', () => {
    const bad = { ...validQuestion, statement: 123 };
    expect(validate(bad)).toBe(false);
  });

  test('rejects options containing non-strings', () => {
    const bad = { ...validQuestion, options: ['A', 'B', 3] };
    expect(validate(bad)).toBe(false);
  });
});
