'use strict';

/**
 * Question schema (see README section "Banco de preguntas"):
 * {
 *   id: string,                 // unique identifier, e.g. "trex-01"
 *   dinosaur: string,           // one of DINOSAURS values
 *   question: string,           // enunciado shown to the player
 *   options: string[],          // 3-4 answer choices
 *   correctAnswerIndex: number, // index into "options" of the correct answer
 *   dato_curioso: string,       // i18n key (in src/i18n/*.json under "funFacts")
 *                                // resolving to the dato curioso shown after answering
 *   image: string,              // reference to the dinosaur's cartoon illustration
 *   imageRealistic: string,     // reference to the dinosaur's realistic-style illustration
 *   imageFallback: string,      // reference to the dinosaur's local fallback asset, used if
 *                                // the cartoon/realistic image fails to load
 *   imageAlt: string,           // neutral, educational alt text shared by the dinosaur's
 *                                // image variants (style-consistent, no dato curioso spoilers)
 *   level: number,              // difficulty level, an integer from MIN_LEVEL to MAX_LEVEL
 * }
 *
 * AW5: `loadQuestionBank()` excludes any entry missing `imageRealistic`,
 * `imageFallback` or `imageAlt` from the usable bank instead of failing the
 * whole load — see `hasImageVariants`/`filterQuestionsWithImageVariants`.
 *
 * TRIOFSND-202: `getQuestionsByLevel()` validates every mandatory field of
 * each raw entry (schema fields plus the AW5 image variants) and emits a
 * `content_validation_failed` log event — via the logging service — for any
 * entry that breaks a rule, excluding that entry from the returned pool
 * instead of failing the whole load.
 */

const fs = require('fs');
const path = require('path');

const { getStrings } = require('../i18n');
const { LogService } = require('../services/logging');

// The question bank JSON lives under public/data so the browser can fetch it
// at runtime (/data/questions.json, precached/runtime-cached by the service
// worker) without duplicating it between src/ and public/ — the same rationale
// as public/i18n/es.json (loaded here via this Node-side loader, and via
// fetch() from public/scripts/main.js in the browser).
const QUESTIONS_JSON_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'questions.json');

const DINOSAURS = Object.freeze({
  TREX: 'trex',
  TRICERATOPS: 'triceratops',
  VELOCIRAPTOR: 'velociraptor',
  ESTEGOSAURIO: 'estegosaurio',
  BRAQUIOSAURIO: 'braquiosaurio',
  ANKYLOSAURUS: 'ankylosaurus',
  PTERANODON: 'pteranodon',
});

const VALID_DINOSAURS = Object.values(DINOSAURS);
const MIN_OPTIONS = 3;
const MAX_OPTIONS = 4;
const MIN_QUESTIONS_PER_DINOSAUR = 3;
const MIN_LEVEL = 1;
const MAX_LEVEL = 10;
// VALID_LEVELS/EXPECTED_QUESTION_COUNT are NOT a mirror of MAX_LEVEL: they
// describe the content-completeness contract for the levels actually shipped
// in public/data/questions.json today (150 questions, 30 per level, levels
// 1-5 — see the "TRIOFSND-202: contains exactly 150 valid questions, 30 per
// level" test). MAX_LEVEL is the generic ceiling gameFlow.js's
// resolveLevelOutcome/completeLevel progress toward (TRIOFSND-207+), raised
// ahead of content so the game logic doesn't need reshaping again once levels
// 6-10 ship; getQuestionsByLevel/startLevel already degrade a level with no
// content to a graceful 'level_generation_failed' instead of crashing. Extend
// this list only once real questions for that level exist in the bank.
const VALID_LEVELS = Object.freeze([1, 2, 3, 4, 5]);
const QUESTIONS_PER_LEVEL = 30;
const EXPECTED_QUESTION_COUNT = VALID_LEVELS.length * QUESTIONS_PER_LEVEL;

function describeQuestion(question, index) {
  const id = question && typeof question === 'object' ? question.id : undefined;
  return `question at index ${index}${id ? ` (id: ${id})` : ''}`;
}

// Structured violations (a machine-readable "rule" plus a human-readable
// "message") back both `validateQuestion()` (existing string-based API,
// kept for backwards compatibility) and `getQuestionsByLevel()`'s
// `content_validation_failed` logging (TRIOFSND-202), which needs the rule
// name rather than a free-text message.
function collectQuestionViolations(question, index) {
  const where = describeQuestion(question, index);

  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    return [{ rule: 'shape', message: `${where}: must be an object` }];
  }

  const violations = [];

  if (typeof question.id !== 'string' || question.id.trim() === '') {
    violations.push({ rule: 'id', message: `${where}: "id" must be a non-empty string` });
  }

  if (!VALID_DINOSAURS.includes(question.dinosaur)) {
    violations.push({
      rule: 'dinosaur',
      message: `${where}: "dinosaur" must be one of ${VALID_DINOSAURS.join(', ')}`,
    });
  }

  if (typeof question.question !== 'string' || question.question.trim() === '') {
    violations.push({ rule: 'question', message: `${where}: "question" must be a non-empty string` });
  }

  const hasValidOptionsArray =
    Array.isArray(question.options) &&
    question.options.length >= MIN_OPTIONS &&
    question.options.length <= MAX_OPTIONS;

  if (!hasValidOptionsArray) {
    violations.push({
      rule: 'options',
      message: `${where}: "options" must be an array of ${MIN_OPTIONS}-${MAX_OPTIONS} strings`,
    });
  } else {
    question.options.forEach((option, optionIndex) => {
      if (typeof option !== 'string' || option.trim() === '') {
        violations.push({
          rule: 'options',
          message: `${where}: option at index ${optionIndex} must be a non-empty string`,
        });
      }
    });

    const uniqueOptions = new Set(question.options);
    if (uniqueOptions.size !== question.options.length) {
      violations.push({ rule: 'options', message: `${where}: "options" must not contain duplicate values` });
    }
  }

  const correctIndexInRange =
    hasValidOptionsArray &&
    Number.isInteger(question.correctAnswerIndex) &&
    question.correctAnswerIndex >= 0 &&
    question.correctAnswerIndex < question.options.length;

  if (!Number.isInteger(question.correctAnswerIndex) || (hasValidOptionsArray && !correctIndexInRange)) {
    violations.push({
      rule: 'correctAnswerIndex',
      message: `${where}: "correctAnswerIndex" must be a valid index into "options"`,
    });
  }

  if (typeof question.dato_curioso !== 'string' || question.dato_curioso.trim() === '') {
    violations.push({
      rule: 'dato_curioso',
      message: `${where}: "dato_curioso" must be a non-empty i18n key string`,
    });
  }

  if (typeof question.image !== 'string' || question.image.trim() === '') {
    violations.push({ rule: 'image', message: `${where}: "image" must be a non-empty string` });
  }

  if (!Number.isInteger(question.level) || question.level < MIN_LEVEL || question.level > MAX_LEVEL) {
    violations.push({
      rule: 'level',
      message: `${where}: "level" must be an integer between ${MIN_LEVEL} and ${MAX_LEVEL}`,
    });
  }

  return violations;
}

function validateQuestion(question, index) {
  return collectQuestionViolations(question, index).map((violation) => violation.message);
}

function validateQuestionBank(questions, options = {}) {
  if (!Array.isArray(questions)) {
    return ['The question bank must be an array of questions'];
  }

  const checkCount = options.checkCount !== undefined ? options.checkCount : true;

  const errors = questions.flatMap((question, index) => validateQuestion(question, index));

  const ids = questions.map((question) => question && question.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    errors.push('All questions must have a unique "id"');
  }

  if (checkCount && questions.length !== EXPECTED_QUESTION_COUNT) {
    errors.push(`The question bank must contain exactly ${EXPECTED_QUESTION_COUNT} questions, found ${questions.length}`);
  }

  return errors;
}

// AW5: a question only counts as "complete" once it carries both image
// variants (cartoon `image` is validated separately in validateQuestion) and
// a local fallback asset, plus the shared neutral/educational alt text.
function hasImageVariants(question) {
  return Boolean(
    question &&
      typeof question === 'object' &&
      typeof question.imageRealistic === 'string' &&
      question.imageRealistic.trim() !== '' &&
      typeof question.imageFallback === 'string' &&
      question.imageFallback.trim() !== '' &&
      typeof question.imageAlt === 'string' &&
      question.imageAlt.trim() !== ''
  );
}

// AW5: excludes questions missing a realistic variant, a fallback asset or
// an alt text from the bank instead of failing the whole load — a single
// incomplete entry never blocks the rest of the game.
function filterQuestionsWithImageVariants(questions) {
  return questions.filter((question) => hasImageVariants(question));
}

function getDinosaurCoverageErrors(questions) {
  const countsByDinosaur = VALID_DINOSAURS.reduce((counts, dinosaur) => {
    counts[dinosaur] = 0;
    return counts;
  }, {});
  questions.forEach((question) => {
    if (question && Object.prototype.hasOwnProperty.call(countsByDinosaur, question.dinosaur)) {
      countsByDinosaur[question.dinosaur] += 1;
    }
  });

  return VALID_DINOSAURS.filter((dinosaur) => countsByDinosaur[dinosaur] < MIN_QUESTIONS_PER_DINOSAUR).map(
    (dinosaur) =>
      `Dinosaur "${dinosaur}" must have at least ${MIN_QUESTIONS_PER_DINOSAUR} questions, found ${countsByDinosaur[dinosaur]}`
  );
}

// TRIOFSND-202: the bank must contain exactly QUESTIONS_PER_LEVEL (30)
// questions for each of the 5 levels (150 total) once invalid entries have
// been excluded.
function getLevelCoverageErrors(questions) {
  const countsByLevel = VALID_LEVELS.reduce((counts, level) => {
    counts[level] = 0;
    return counts;
  }, {});
  questions.forEach((question) => {
    if (question && Object.prototype.hasOwnProperty.call(countsByLevel, question.level)) {
      countsByLevel[question.level] += 1;
    }
  });

  return VALID_LEVELS.filter((level) => countsByLevel[level] !== QUESTIONS_PER_LEVEL).map(
    (level) => `Level ${level} must have exactly ${QUESTIONS_PER_LEVEL} questions, found ${countsByLevel[level]}`
  );
}

function resolveDatoCurioso(strings, key) {
  if (typeof key !== 'string' || key.trim() === '') {
    return undefined;
  }
  return key
    .split('.')
    .reduce((value, segment) => (value && typeof value === 'object' ? value[segment] : undefined), strings);
}

function getDatoCuriosoTranslationErrors(questions, strings) {
  return questions.reduce((errors, question, index) => {
    const where = describeQuestion(question, index);
    if (!question || typeof question.dato_curioso !== 'string' || question.dato_curioso.trim() === '') {
      return errors;
    }

    const text = resolveDatoCurioso(strings, question.dato_curioso);
    if (typeof text !== 'string' || text.trim() === '') {
      errors.push(`${where}: "dato_curioso" key "${question.dato_curioso}" has no i18n translation`);
    }

    return errors;
  }, []);
}

function loadQuestionBank(options = {}) {
  const filePath = options.filePath || QUESTIONS_JSON_PATH;
  const checkCoverage = options.checkCoverage !== undefined ? options.checkCoverage : !options.filePath;
  const checkCount = options.checkCount !== undefined ? options.checkCount : !options.filePath;
  const checkTranslations = options.checkTranslations !== undefined ? options.checkTranslations : !options.filePath;
  const raw = fs.readFileSync(filePath, 'utf-8');

  let parsedQuestions;
  try {
    parsedQuestions = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse question bank JSON at ${filePath}: ${error.message}`);
  }

  // AW5: filter out incomplete entries before validating, so a question
  // missing its realistic/fallback art doesn't fail the whole bank — it is
  // just excluded from what's returned.
  const questions = Array.isArray(parsedQuestions)
    ? filterQuestionsWithImageVariants(parsedQuestions)
    : parsedQuestions;

  const errors = validateQuestionBank(questions, { checkCount });
  if (checkCoverage) {
    errors.push(...getDinosaurCoverageErrors(questions));
    errors.push(...getLevelCoverageErrors(questions));
  }
  if (checkTranslations) {
    errors.push(...getDatoCuriosoTranslationErrors(questions, getStrings('es')));
  }
  if (errors.length > 0) {
    throw new Error(`Invalid question bank:\n- ${errors.join('\n- ')}`);
  }

  return questions;
}

function getQuestionsByDinosaur(questions, dinosaur) {
  return questions.filter((question) => question.dinosaur === dinosaur);
}

// TRIOFSND-202: `imageRealistic`/`imageFallback`/`imageAlt` (AW5) are
// mandatory fields too, but reported as their own rules here (instead of the
// combined `hasImageVariants()` boolean) so `content_validation_failed`
// carries a precise "regla incumplida" per missing field.
function collectImageVariantViolations(question, index) {
  const where = describeQuestion(question, index);
  const violations = [];

  ['imageRealistic', 'imageFallback', 'imageAlt'].forEach((field) => {
    const value = question && typeof question === 'object' ? question[field] : undefined;
    if (typeof value !== 'string' || value.trim() === '') {
      violations.push({ rule: field, message: `${where}: "${field}" must be a non-empty string` });
    }
  });

  return violations;
}

let defaultLogService;
function getDefaultLogService() {
  if (!defaultLogService) {
    defaultLogService = new LogService();
  }
  return defaultLogService;
}

function logContentValidationFailure(logService, question, rule) {
  const id = question && typeof question === 'object' && typeof question.id === 'string' && question.id.trim() !== ''
    ? question.id
    : 'unknown';
  const level = question && typeof question === 'object' ? question.level : undefined;

  logService.logEvent('content_validation_failed', { id, level, rule });
}

// TRIOFSND-202: validates every mandatory field of each raw entry (the
// `validateQuestion` schema plus the AW5 image variants), emits
// `content_validation_failed` for any entry that breaks a rule and excludes
// that entry from the returned pool — a single invalid question never blocks
// the rest of the bank, mirroring the AW5 image-variant filtering above.
function getValidQuestions(rawQuestions, logService) {
  return rawQuestions.filter((question, index) => {
    const violations = [...collectQuestionViolations(question, index), ...collectImageVariantViolations(question, index)];

    if (violations.length === 0) {
      return true;
    }

    violations.forEach((violation) => logContentValidationFailure(logService, question, violation.rule));
    return false;
  });
}

/**
 * Returns every valid question for the given difficulty level.
 *
 * Loads the raw question bank (from `options.filePath`/`QUESTIONS_JSON_PATH`,
 * or `options.questions` if provided), validates each entry's mandatory
 * fields and excludes any invalid entry from the pool — logging a
 * `content_validation_failed` event (id, level, violated rule) via
 * `options.logService` (a `LogService`-shaped `{ logEvent(eventType, metadata) }`,
 * defaulting to a shared `LogService` instance) for each one.
 */
function getQuestionsByLevel(level, options = {}) {
  const filePath = options.filePath || QUESTIONS_JSON_PATH;
  const logService = options.logService || getDefaultLogService();

  let rawQuestions = options.questions;
  if (!rawQuestions) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    try {
      rawQuestions = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Failed to parse question bank JSON at ${filePath}: ${error.message}`);
    }
  }

  if (!Array.isArray(rawQuestions)) {
    throw new Error('The question bank must be an array of questions');
  }

  const validQuestions = getValidQuestions(rawQuestions, logService);
  return validQuestions.filter((question) => question.level === level);
}

module.exports = {
  DINOSAURS,
  VALID_DINOSAURS,
  MIN_OPTIONS,
  MAX_OPTIONS,
  MIN_QUESTIONS_PER_DINOSAUR,
  MIN_LEVEL,
  MAX_LEVEL,
  VALID_LEVELS,
  QUESTIONS_PER_LEVEL,
  EXPECTED_QUESTION_COUNT,
  QUESTIONS_JSON_PATH,
  validateQuestion,
  validateQuestionBank,
  hasImageVariants,
  filterQuestionsWithImageVariants,
  getDinosaurCoverageErrors,
  getLevelCoverageErrors,
  resolveDatoCurioso,
  getDatoCuriosoTranslationErrors,
  loadQuestionBank,
  getQuestionsByDinosaur,
  getQuestionsByLevel,
};
