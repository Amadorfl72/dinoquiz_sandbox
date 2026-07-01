const schema = require('../src/schemas/question.schema.json');

describe('TRIOFSND-8: Question JSON Schema Definition', () => {
  it('should be a valid JSON Schema object', () => {
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
    expect(schema.$schema).toMatch(/json-schema\.org/);
    expect(schema.type).toBe('object');
  });

  it('should define all required properties', () => {
    const requiredProps = ['statement', 'options', 'correctIndex', 'dinoId', 'funFact', 'image'];
    expect(schema.required).toEqual(expect.arrayContaining(requiredProps));
  });

  it('should define statement as a non-empty string', () => {
    expect(schema.properties.statement.type).toBe('string');
    expect(schema.properties.statement.minLength).toBeGreaterThanOrEqual(1);
  });

  it('should define options as an array of exactly 3 strings', () => {
    const options = schema.properties.options;
    expect(options.type).toBe('array');
    expect(options.minItems).toBe(3);
    expect(options.maxItems).toBe(3);
    expect(options.items.type).toBe('string');
    expect(options.items.minLength).toBeGreaterThanOrEqual(1);
  });

  it('should define correctIndex as an integer between 0 and 2', () => {
    const correctIndex = schema.properties.correctIndex;
    expect(correctIndex.type).toBe('integer');
    expect(correctIndex.minimum).toBe(0);
    expect(correctIndex.maximum).toBe(2);
  });

  it('should define dinoId as a non-empty string', () => {
    expect(schema.properties.dinoId.type).toBe('string');
    expect(schema.properties.dinoId.minLength).toBeGreaterThanOrEqual(1);
  });

  it('should define funFact as a non-empty string', () => {
    expect(schema.properties.funFact.type).toBe('string');
    expect(schema.properties.funFact.minLength).toBeGreaterThanOrEqual(1);
  });

  it('should define image as a non-empty string (URL or path)', () => {
    expect(schema.properties.image.type).toBe('string');
    expect(schema.properties.image.minLength).toBeGreaterThanOrEqual(1);
  });

  it('should not allow additional properties by default', () => {
    expect(schema.additionalProperties).toBe(false);
  });
});
