'use strict';

/**
 * Question schema (see README section "Banco de preguntas"):
 * {
 *   id: string,                 // unique identifier, e.g. "trex-01"
 *   dinosaur: string,           // one of DINOSAURS values
 *   question: string,           // enunciado shown to the player
 *   options: string[],          // 3-4 answer choices
 *   correctAnswerIndex: number, // index into "options" of the correct answer
 *   funFact: string,            // dato curioso shown after answering
 *   image: string,              // reference to the dinosaur's illustration
 * }
 */

const fs = require('fs');
const path = require('path');

const QUESTIONS_JSON_PATH = path.join(__dirname, 'questions.json');

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

  if (typeof question.funFact !== 'string' || question.funFact.trim() === '') {
    errors.push(`${where}: "funFact" must be a non-empty string`);
  }

  if (typeof question.image !== 'string' || question.image.trim() === '') {
    errors.push(`${where}: "image" must be a non-empty string`);
  }

  return errors;
}

function validateQuestionBank(questions) {
  if (!Array.isArray(questions)) {
    return ['The question bank must be an array of questions'];
  }

  const errors = questions.flatMap((question, index) => validateQuestion(question, index));

  const ids = questions.map((question) => question && question.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    errors.push('All questions must have a unique "id"');
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

function loadQuestionBank(options = {}) {
  const filePath = options.filePath || QUESTIONS_JSON_PATH;
  const checkCoverage = options.checkCoverage !== undefined ? options.checkCoverage : !options.filePath;
  const raw = fs.readFileSync(filePath, 'utf-8');

  let questions;
  try {
    questions = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse question bank JSON at ${filePath}: ${error.message}`);
  }

  const errors = validateQuestionBank(questions);
  if (checkCoverage) {
    errors.push(...getDinosaurCoverageErrors(questions));
  }
  if (errors.length > 0) {
    throw new Error(`Invalid question bank:\n- ${errors.join('\n- ')}`);
  }

  return questions;
}

function getQuestionsByDinosaur(questions, dinosaur) {
  return questions.filter((question) => question.dinosaur === dinosaur);
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
  loadQuestionBank,
  getQuestionsByDinosaur,
};
