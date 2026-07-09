'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DINOSAURS,
  VALID_DINOSAURS,
  MIN_OPTIONS,
  MAX_OPTIONS,
  MIN_QUESTIONS_PER_DINOSAUR,
  EXPECTED_QUESTION_COUNT,
  validateQuestion,
  validateQuestionBank,
  getDinosaurCoverageErrors,
  resolveDatoCurioso,
  getDatoCuriosoTranslationErrors,
  loadQuestionBank,
  getQuestionsByDinosaur,
} = require('./questionBank');
const { getStrings } = require('../i18n');

function buildValidQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    dinosaur: DINOSAURS.TREX,
    question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
    options: ['Solo de plantas', 'De carne', 'Solo de insectos', 'De algas del mar'],
    correctAnswerIndex: 1,
    dato_curioso: 'funFacts.trex-01',
    image: 'dinosaurs/trex.png',
    ...overrides,
  };
}

function writeTempQuestionBank(questions) {
  const filePath = path.join(os.tmpdir(), `dinoquiz-questions-${process.hrtime.bigint()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(questions), 'utf-8');
  return filePath;
}

describe('real question bank (public/data/questions.json)', () => {
  const questions = loadQuestionBank();

  test('loads exactly the expected number of questions', () => {
    expect(questions).toHaveLength(EXPECTED_QUESTION_COUNT);
  });

  test('has no validation errors', () => {
    expect(validateQuestionBank(questions)).toEqual([]);
  });

  test('covers every required dinosaur with at least the minimum number of questions', () => {
    VALID_DINOSAURS.forEach((dinosaur) => {
      const dinosaurQuestions = getQuestionsByDinosaur(questions, dinosaur);
      expect(dinosaurQuestions.length).toBeGreaterThanOrEqual(MIN_QUESTIONS_PER_DINOSAUR);
    });
  });

  test('has all unique ids', () => {
    const ids = questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every question has 3-4 options and a valid correct answer index', () => {
    questions.forEach((question) => {
      expect(question.options.length).toBeGreaterThanOrEqual(MIN_OPTIONS);
      expect(question.options.length).toBeLessThanOrEqual(MAX_OPTIONS);
      expect(question.correctAnswerIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctAnswerIndex).toBeLessThan(question.options.length);
    });
  });

  test('every question has a non-empty dato_curioso key and image reference', () => {
    questions.forEach((question) => {
      expect(question.dato_curioso.trim().length).toBeGreaterThan(0);
      expect(question.image.trim().length).toBeGreaterThan(0);
    });
  });

  test('every question dato_curioso key resolves to a non-empty i18n string', () => {
    const strings = getStrings('es');
    expect(getDatoCuriosoTranslationErrors(questions, strings)).toEqual([]);
  });

  test('every one of the 7 covered species has a dato curioso on each of its questions', () => {
    const strings = getStrings('es');
    VALID_DINOSAURS.forEach((dinosaur) => {
      const dinosaurQuestions = getQuestionsByDinosaur(questions, dinosaur);
      expect(dinosaurQuestions.length).toBeGreaterThan(0);
      dinosaurQuestions.forEach((question) => {
        const text = resolveDatoCurioso(strings, question.dato_curioso);
        expect(typeof text).toBe('string');
        expect(text.trim().length).toBeGreaterThan(0);
      });
    });
  });
});

describe('validateQuestion', () => {
  test('accepts a well-formed question', () => {
    expect(validateQuestion(buildValidQuestion(), 0)).toEqual([]);
  });

  test('rejects a missing id', () => {
    const errors = validateQuestion(buildValidQuestion({ id: '' }), 0);
    expect(errors.some((error) => error.includes('"id"'))).toBe(true);
  });

  test('rejects an unknown dinosaur', () => {
    const errors = validateQuestion(buildValidQuestion({ dinosaur: 'stegosaurus-rex-9000' }), 0);
    expect(errors.some((error) => error.includes('"dinosaur"'))).toBe(true);
  });

  test('rejects too few options', () => {
    const errors = validateQuestion(
      buildValidQuestion({ options: ['Solo dos', 'Opciones'], correctAnswerIndex: 0 }),
      0
    );
    expect(errors.some((error) => error.includes('"options"'))).toBe(true);
  });

  test('rejects too many options', () => {
    const errors = validateQuestion(
      buildValidQuestion({ options: ['Una', 'Dos', 'Tres', 'Cuatro', 'Cinco'], correctAnswerIndex: 0 }),
      0
    );
    expect(errors.some((error) => error.includes('"options"'))).toBe(true);
  });

  test('rejects duplicate options', () => {
    const errors = validateQuestion(
      buildValidQuestion({ options: ['Igual', 'Igual', 'Distinta'], correctAnswerIndex: 0 }),
      0
    );
    expect(errors.some((error) => error.includes('duplicate'))).toBe(true);
  });

  test('rejects a correctAnswerIndex out of range', () => {
    const errors = validateQuestion(buildValidQuestion({ correctAnswerIndex: 7 }), 0);
    expect(errors.some((error) => error.includes('correctAnswerIndex'))).toBe(true);
  });

  test('rejects a non-integer correctAnswerIndex', () => {
    const errors = validateQuestion(buildValidQuestion({ correctAnswerIndex: 1.5 }), 0);
    expect(errors.some((error) => error.includes('correctAnswerIndex'))).toBe(true);
  });

  test('rejects a missing dato_curioso', () => {
    const errors = validateQuestion(buildValidQuestion({ dato_curioso: '   ' }), 0);
    expect(errors.some((error) => error.includes('dato_curioso'))).toBe(true);
  });

  test('rejects a missing image reference', () => {
    const errors = validateQuestion(buildValidQuestion({ image: '' }), 0);
    expect(errors.some((error) => error.includes('image'))).toBe(true);
  });
});

describe('validateQuestionBank', () => {
  test('flags duplicate ids across questions', () => {
    const questions = [
      buildValidQuestion({ id: 'dup-1' }),
      buildValidQuestion({ id: 'dup-1', dinosaur: DINOSAURS.TRICERATOPS }),
    ];
    const errors = validateQuestionBank(questions);
    expect(errors.some((error) => error.includes('unique'))).toBe(true);
  });

  test('rejects a non-array payload', () => {
    expect(validateQuestionBank({ not: 'an array' })).toEqual(['The question bank must be an array of questions']);
  });

  test('rejects a bank with fewer than the expected number of questions by default', () => {
    const questions = Array.from({ length: EXPECTED_QUESTION_COUNT - 1 }, (_, index) =>
      buildValidQuestion({ id: `trex-${index}` })
    );

    const errors = validateQuestionBank(questions);

    expect(errors.some((error) => error.includes(`exactly ${EXPECTED_QUESTION_COUNT}`))).toBe(true);
  });

  test('rejects a bank with more than the expected number of questions by default', () => {
    const questions = Array.from({ length: EXPECTED_QUESTION_COUNT + 1 }, (_, index) =>
      buildValidQuestion({ id: `trex-${index}` })
    );

    const errors = validateQuestionBank(questions);

    expect(errors.some((error) => error.includes(`exactly ${EXPECTED_QUESTION_COUNT}`))).toBe(true);
  });

  test('allows opting out of the total count check', () => {
    const questions = [buildValidQuestion()];

    expect(validateQuestionBank(questions, { checkCount: false })).toEqual([]);
  });
});

describe('getDinosaurCoverageErrors', () => {
  test('flags a dinosaur with fewer than the minimum required questions', () => {
    const questions = [
      buildValidQuestion({ id: 'trex-01', dinosaur: DINOSAURS.TREX }),
      buildValidQuestion({ id: 'triceratops-01', dinosaur: DINOSAURS.TRICERATOPS }),
      buildValidQuestion({ id: 'triceratops-02', dinosaur: DINOSAURS.TRICERATOPS }),
      buildValidQuestion({ id: 'triceratops-03', dinosaur: DINOSAURS.TRICERATOPS }),
    ];

    const errors = getDinosaurCoverageErrors(questions);

    expect(errors.some((error) => error.includes(DINOSAURS.TREX))).toBe(true);
    expect(errors.some((error) => error.includes(DINOSAURS.TRICERATOPS))).toBe(false);
  });

  test('returns no errors when every dinosaur meets the minimum', () => {
    const questions = VALID_DINOSAURS.flatMap((dinosaur) =>
      Array.from({ length: MIN_QUESTIONS_PER_DINOSAUR }, (_, questionIndex) =>
        buildValidQuestion({ id: `${dinosaur}-${questionIndex}`, dinosaur })
      )
    );

    expect(getDinosaurCoverageErrors(questions)).toEqual([]);
  });
});

describe('resolveDatoCurioso', () => {
  const strings = { funFacts: { 'trex-01': 'El T-Rex tenía una mordida muy potente.' } };

  test('resolves a dotted i18n key to its translated string', () => {
    expect(resolveDatoCurioso(strings, 'funFacts.trex-01')).toBe('El T-Rex tenía una mordida muy potente.');
  });

  test('returns undefined for a key with no matching translation', () => {
    expect(resolveDatoCurioso(strings, 'funFacts.unknown')).toBeUndefined();
  });

  test('returns undefined for an empty or non-string key', () => {
    expect(resolveDatoCurioso(strings, '')).toBeUndefined();
    expect(resolveDatoCurioso(strings, undefined)).toBeUndefined();
  });
});

describe('getDatoCuriosoTranslationErrors', () => {
  const strings = { funFacts: { 'trex-01': 'El T-Rex tenía una mordida muy potente.' } };

  test('returns no errors when every dato_curioso key resolves', () => {
    const questions = [buildValidQuestion({ dato_curioso: 'funFacts.trex-01' })];

    expect(getDatoCuriosoTranslationErrors(questions, strings)).toEqual([]);
  });

  test('flags a dato_curioso key with no matching translation', () => {
    const questions = [buildValidQuestion({ dato_curioso: 'funFacts.missing' })];

    const errors = getDatoCuriosoTranslationErrors(questions, strings);

    expect(errors.some((error) => error.includes('funFacts.missing'))).toBe(true);
  });
});

describe('loadQuestionBank', () => {
  test('loads and validates a well-formed JSON file from disk', () => {
    const filePath = writeTempQuestionBank([buildValidQuestion()]);
    try {
      const questions = loadQuestionBank({ filePath });
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe('trex-01');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('throws a descriptive error for invalid questions', () => {
    const filePath = writeTempQuestionBank([buildValidQuestion({ options: ['Solo una opción'] })]);
    try {
      expect(() => loadQuestionBank({ filePath })).toThrow(/Invalid question bank/);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('does not enforce dinosaur coverage for a custom filePath by default', () => {
    const filePath = writeTempQuestionBank([buildValidQuestion()]);
    try {
      expect(() => loadQuestionBank({ filePath })).not.toThrow();
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('enforces dinosaur coverage for a custom filePath when explicitly requested', () => {
    const filePath = writeTempQuestionBank([buildValidQuestion()]);
    try {
      expect(() => loadQuestionBank({ filePath, checkCoverage: true })).toThrow(/must have at least/);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('does not enforce the total question count for a custom filePath by default', () => {
    const filePath = writeTempQuestionBank([buildValidQuestion()]);
    try {
      expect(() => loadQuestionBank({ filePath })).not.toThrow();
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('enforces the total question count for a custom filePath when explicitly requested', () => {
    const filePath = writeTempQuestionBank([buildValidQuestion()]);
    try {
      expect(() => loadQuestionBank({ filePath, checkCount: true })).toThrow(/must contain exactly/);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('does not enforce dato_curioso translations for a custom filePath by default', () => {
    const filePath = writeTempQuestionBank([buildValidQuestion({ dato_curioso: 'funFacts.does-not-exist' })]);
    try {
      expect(() => loadQuestionBank({ filePath })).not.toThrow();
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('enforces dato_curioso translations for a custom filePath when explicitly requested', () => {
    const filePath = writeTempQuestionBank([buildValidQuestion({ dato_curioso: 'funFacts.does-not-exist' })]);
    try {
      expect(() => loadQuestionBank({ filePath, checkTranslations: true })).toThrow(/no i18n translation/);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('throws a descriptive error for malformed JSON', () => {
    const filePath = path.join(os.tmpdir(), `dinoquiz-questions-broken-${process.hrtime.bigint()}.json`);
    fs.writeFileSync(filePath, '{ not valid json', 'utf-8');
    try {
      expect(() => loadQuestionBank({ filePath })).toThrow(/Failed to parse question bank JSON/);
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});

describe('getQuestionsByDinosaur', () => {
  test('filters questions belonging to the requested dinosaur', () => {
    const questions = [
      buildValidQuestion({ id: 'trex-01', dinosaur: DINOSAURS.TREX }),
      buildValidQuestion({ id: 'triceratops-01', dinosaur: DINOSAURS.TRICERATOPS }),
      buildValidQuestion({ id: 'trex-02', dinosaur: DINOSAURS.TREX }),
    ];

    const trexQuestions = getQuestionsByDinosaur(questions, DINOSAURS.TREX);

    expect(trexQuestions).toHaveLength(2);
    expect(trexQuestions.every((question) => question.dinosaur === DINOSAURS.TREX)).toBe(true);
  });
});
