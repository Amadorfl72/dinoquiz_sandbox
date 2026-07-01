const Ajv = require("ajv");
const questionSchema = require("../src/schemas/question.schema.json");
const seedData = require("../src/data/questions.seed.json");

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(questionSchema);

describe("TRIOFSND-8: Questions JSON Schema and Seed Data", () => {
  it("should have a valid JSON schema definition with required fields", () => {
    expect(questionSchema).toBeDefined();
    expect(questionSchema.type).toBe("object");
    
    const props = questionSchema.properties;
    expect(props.statement.type).toBe("string");
    
    expect(props.options.type).toBe("array");
    expect(props.options.minItems).toBe(3);
    expect(props.options.maxItems).toBe(3);
    expect(props.options.items.type).toBe("string");
    
    expect(props.correctIndex.type).toBe("integer");
    expect(props.correctIndex.minimum).toBe(0);
    expect(props.correctIndex.maximum).toBe(2);
    
    expect(props.dinoId).toBeDefined();
    expect(props.funFact.type).toBe("string");
    expect(props.image.type).toBe("string");
    
    expect(questionSchema.required).toEqual(
      expect.arrayContaining(["statement", "options", "correctIndex", "dinoId", "funFact", "image"])
    );
  });

  it("should seed exactly 30 dinosaur questions", () => {
    expect(Array.isArray(seedData)).toBe(true);
    expect(seedData.length).toBe(30);
  });

  it("should validate all seed data against the schema", () => {
    seedData.forEach((question, index) => {
      const valid = validate(question);
      if (!valid) {
        console.error(`Validation failed for question at index ${index}:`, validate.errors);
      }
      expect(valid).toBe(true);
    });
  });

  it("should have exactly 3 string options for each question", () => {
    seedData.forEach((question, index) => {
      expect(question.options).toHaveLength(3);
      question.options.forEach((option) => {
        expect(typeof option).toBe("string");
        expect(option.length).toBeGreaterThan(0);
      });
    });
  });

  it("should have a correctIndex between 0 and 2 for all questions", () => {
    seedData.forEach((question, index) => {
      expect(Number.isInteger(question.correctIndex)).toBe(true);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThanOrEqual(2);
    });
  });

  it("should have non-empty strings for statement, funFact, and image", () => {
    seedData.forEach((question, index) => {
      expect(typeof question.statement).toBe("string");
      expect(question.statement.length).toBeGreaterThan(0);
      
      expect(typeof question.funFact).toBe("string");
      expect(question.funFact.length).toBeGreaterThan(0);
      
      expect(typeof question.image).toBe("string");
      expect(question.image.length).toBeGreaterThan(0);
    });
  });
});
