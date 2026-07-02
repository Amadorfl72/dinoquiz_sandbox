const fs = require('fs');
const path = require('path');

const QUESTION_BANK_PATH = path.resolve(__dirname, '../src/assets/questions.json');

const REQUIRED_DINOSAURS = [
  'T-Rex',
  'Triceratops',
  'Velociraptor',
  'Stegosaurus',
  'Brachiosaurus',
  'Ankylosaurus',
  'Pteranodon',
];

const REQUIRED_FIELDS = [
  'id',
  'dinosaur',
  'statement',
  'options',
  'correctAnswer',
  'funFact',
  'imageReference',
];

let questionBank;

beforeAll(() => {
  const raw = fs.readFileSync(QUESTION_BANK_PATH, 'utf-8');
  questionBank = JSON.parse(raw);
});

describe('TRIOFSND-57: Local JSON Question Bank', () => {
  describe('File existence and validity', () => {
    test('should have a questions.json file in the src/assets directory', () => {
      expect(fs.existsSync(QUESTION_BANK_PATH)).toBe(true);
    });

    test('should be valid JSON', () => {
      expect(() => JSON.parse(fs.readFileSync(QUESTION_BANK_PATH, 'utf-8'))).not.toThrow();
    });

    test('should be an array of questions', () => {
      expect(Array.isArray(questionBank)).toBe(true);
    });
  });

  describe('Question count', () => {
    test('should contain exactly 40 questions', () => {
      expect(questionBank.length).toBe(40);
    });
  });

  describe('Question structure', () => {
    test('each question should have all required fields', () => {
      questionBank.forEach((question, index) => {
        REQUIRED_FIELDS.forEach((field) => {
          expect(question).toHaveProperty(field);
          expect(question[field]).not.toBeUndefined();
          expect(question[field]).not.toBeNull();
        });
      });
    });

    test('each question should have a numeric id', () => {
      questionBank.forEach((question, index) => {
        expect(typeof question.id).toBe('number');
        expect(question.id).toBeGreaterThan(0);
      });
    });

    test('all ids should be unique', () => {
      const ids = questionBank.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('each question should have a non-empty statement string', () => {
      questionBank.forEach((question, index) => {
        expect(typeof question.statement).toBe('string');
        expect(question.statement.trim().length).toBeGreaterThan(0);
      });
    });

    test('each question should have 3 to 4 options', () => {
      questionBank.forEach((question, index) => {
        expect(Array.isArray(question.options)).toBe(true);
        expect(question.options.length).toBeGreaterThanOrEqual(3);
        expect(question.options.length).toBeLessThanOrEqual(4);
      });
    });

    test('each option should be a non-empty string', () => {
      questionBank.forEach((question, index) => {
        question.options.forEach((option, optIndex) => {
          expect(typeof option).toBe('string');
          expect(option.trim().length).toBeGreaterThan(0);
        });
      });
    });

    test('all options within a question should be unique', () => {
      questionBank.forEach((question, index) => {
        const uniqueOptions = new Set(question.options);
        expect(uniqueOptions.size).toBe(question.options.length);
      });
    });

    test('each question should have a correctAnswer that matches one of the options', () => {
      questionBank.forEach((question, index) => {
        expect(question.options).toContain(question.correctAnswer);
      });
    });

    test('each question should have a non-empty funFact string', () => {
      questionBank.forEach((question, index) => {
        expect(typeof question.funFact).toBe('string');
        expect(question.funFact.trim().length).toBeGreaterThan(0);
      });
    });

    test('each question should have a non-empty imageReference string', () => {
      questionBank.forEach((question, index) => {
        expect(typeof question.imageReference).toBe('string');
        expect(question.imageReference.trim().length).toBeGreaterThan(0);
      });
    });

    test('each question should have a valid dinosaur field', () => {
      questionBank.forEach((question, index) => {
        expect(REQUIRED_DINOSAURS).toContain(question.dinosaur);
      });
    });
  });

  describe('Dinosaur coverage', () => {
    const getDinosaurCount = (dinosaur) =>
      questionBank.filter((q) => q.dinosaur === dinosaur).length;

    test('should cover all 7 dinosaurs', () => {
      REQUIRED_DINOSAURS.forEach((dinosaur) => {
        const count = getDinosaurCount(dinosaur);
        expect(count).toBeGreaterThanOrEqual(3);
      });
    });

    test('T-Rex should have at least 3 questions', () => {
      expect(getDinosaurCount('T-Rex')).toBeGreaterThanOrEqual(3);
    });

    test('Triceratops should have at least 3 questions', () => {
      expect(getDinosaurCount('Triceratops')).toBeGreaterThanOrEqual(3);
    });

    test('Velociraptor should have at least 3 questions', () => {
      expect(getDinosaurCount('Velociraptor')).toBeGreaterThanOrEqual(3);
    });

    test('Stegosaurus should have at least 3 questions', () => {
      expect(getDinosaurCount('Stegosaurus')).toBeGreaterThanOrEqual(3);
    });

    test('Brachiosaurus should have at least 3 questions', () => {
      expect(getDinosaurCount('Brachiosaurus')).toBeGreaterThanOrEqual(3);
    });

    test('Ankylosaurus should have at least 3 questions', () => {
      expect(getDinosaurCount('Ankylosaurus')).toBeGreaterThanOrEqual(3);
    });

    test('Pteranodon should have at least 3 questions', () => {
      expect(getDinosaurCount('Pteranodon')).toBeGreaterThanOrEqual(3);
    });

    test('total questions across all dinosaurs should equal 40', () => {
      const total = REQUIRED_DINOSAURS.reduce(
        (sum, d) => sum + getDinosaurCount(d),
        0
      );
      expect(total).toBe(40);
    });
  });

  describe('Question uniqueness', () => {
    test('all question statements should be unique', () => {
      const statements = questionBank.map((q) => q.statement.trim().toLowerCase());
      const uniqueStatements = new Set(statements);
      expect(uniqueStatements.size).toBe(statements.length);
    });

    test('all fun facts should be unique', () => {
      const facts = questionBank.map((q) => q.funFact.trim().toLowerCase());
      const uniqueFacts = new Set(facts);
      expect(uniqueFacts.size).toBe(facts.length);
    });
  });
});
