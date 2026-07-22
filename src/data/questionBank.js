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
 *   image: string,              // reference to the dinosaur's illustration
 * }
 */

const fs = require('fs');
const path = require('path');

const { getStrings } = require('../i18n');

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
const EXPECTED_QUESTION_COUNT = 40;

function describeQuestion(question, index) {
  const id = question && typeof question === 'object' ? question.id : undefined;
  return `question at index ${index}${id ? ` (id: ${id})` : ''}`;
}

function validateQuestion(question, index) {
  const errors = [];
  const where = describeQuestion(question, index);

  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    return [`${where}: must be an object`];
  }

  if (typeof question.id !== 'string' || question.id.trim() === '') {
    errors.push(`${where}: "id" must be a non-empty string`);
  }

  if (!VALID_DINOSAURS.includes(question.dinosaur)) {
    errors.push(`${where}: "dinosaur" must be one of ${VALID_DINOSAURS.join(', ')}`);
  }

  if (typeof question.question !== 'string' || question.question.trim() === '') {
    errors.push(`${where}: "question" must be a non-empty string`);
  }

  const hasValidOptionsArray =
    Array.isArray(question.options) &&
    question.options.length >= MIN_OPTIONS &&
    question.options.length <= MAX_OPTIONS;

  if (!hasValidOptionsArray) {
    errors.push(`${where}: "options" must be an array of ${MIN_OPTIONS}-${MAX_OPTIONS} strings`);
  } else {
    question.options.forEach((option, optionIndex) => {
      if (typeof option !== 'string' || option.trim() === '') {
        errors.push(`${where}: option at index ${optionIndex} must be a non-empty string`);
      }
    });

    const uniqueOptions = new Set(question.options);
    if (uniqueOptions.size !== question.options.length) {
      errors.push(`${where}: "options" must not contain duplicate values`);
    }
  }

  const correctIndexInRange =
    hasValidOptionsArray &&
    Number.isInteger(question.correctAnswerIndex) &&
    question.correctAnswerIndex >= 0 &&
    question.correctAnswerIndex < question.options.length;

  if (!Number.isInteger(question.correctAnswerIndex) || (hasValidOptionsArray && !correctIndexInRange)) {
    errors.push(`${where}: "correctAnswerIndex" must be a valid index into "options"`);
  }

  if (typeof question.dato_curioso !== 'string' || question.dato_curioso.trim() === '') {
    errors.push(`${where}: "dato_curioso" must be a non-empty i18n key string`);
  }

  if (typeof question.image !== 'string' || question.image.trim() === '') {
    errors.push(`${where}: "image" must be a non-empty string`);
  }

  return errors;
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

  let questions;
  try {
    questions = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse question bank JSON at ${filePath}: ${error.message}`);
  }

  const errors = validateQuestionBank(questions, { checkCount });
  if (checkCoverage) {
    errors.push(...getDinosaurCoverageErrors(questions));
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

/**
 * The stable, unique set of "dato curioso" ids (`question.dato_curioso`,
 * e.g. "funFacts.trex-01") actually present in the question bank -- this is
 * the single source of truth for both the discovered/total denominator
 * shown in Inicio/Resultados (TRIOFSND-129) and the membership filter used
 * to sanitize persisted progress on recovery. Never derived from question
 * text, translation, index or position (those aren't stable/unique), and
 * never a hardcoded count -- it reflects whatever the real bank contains.
 */
function getFunFactCatalog(questions) {
  if (!Array.isArray(questions)) {
    return [];
  }

  const ids = questions
    .map((question) => question && question.dato_curioso)
    .filter((id) => typeof id === 'string' && id.trim() !== '');

  return Array.from(new Set(ids));
}

module.exports = {
  DINOSAURS,
  VALID_DINOSAURS,
  MIN_OPTIONS,
  MAX_OPTIONS,
  MIN_QUESTIONS_PER_DINOSAUR,
  EXPECTED_QUESTION_COUNT,
  QUESTIONS_JSON_PATH,
  validateQuestion,
  validateQuestionBank,
  getDinosaurCoverageErrors,
  resolveDatoCurioso,
  getDatoCuriosoTranslationErrors,
  loadQuestionBank,
  getQuestionsByDinosaur,
  getFunFactCatalog,
};
