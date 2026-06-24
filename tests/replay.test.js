/**
 * Unit tests for the 'Volver a jugar' replay flow (TRIOFSND-39).
 */

import { resetGameState, GameState, markGameStarted } from '../src/js/game/state.js';
import { selectQuestions, QUESTIONS_PER_GAME } from '../src/js/game/questionSelector.js';

// Minimal mock question pool (30 items)
function makePool(n = 30) {
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    prompt: `Pregunta ${i}`,
    options: [`A${i}`, `B${i}`, `C${i}`],
    correctIndex: 0,
    funFact: `Dato ${i}`,
    image: `img/dino${i}.png`,
  }));
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

test('resetGameState clears all state', () => {
  GameState.questions = [{}];
  GameState.currentIndex = 5;
  GameState.score = 7;
  GameState.inProgress = true;
  GameState.startedAt = 12345;

  resetGameState();

  assert(GameState.questions.length === 0, 'questions should be empty');
  assert(GameState.currentIndex === 0, 'currentIndex should be 0');
  assert(GameState.score === 0, 'score should be 0');
  assert(GameState.inProgress === false, 'inProgress should be false');
  assert(GameState.startedAt === 0, 'startedAt should be 0');
});

test('selectQuestions returns exactly 10 questions', () => {
  const pool = makePool(30);
  const selected = selectQuestions(pool);
  assert(selected.length === QUESTIONS_PER_GAME, `Expected ${QUESTIONS_PER_GAME} questions`);
});

test('selectQuestions does not repeat questions within a game', () => {
  const pool = makePool(30);
  const selected = selectQuestions(pool);
  const ids = selected.map((q) => q.id);
  const unique = new Set(ids);
  assert(unique.size === selected.length, 'Questions should not repeat');
});

test('selectQuestions shuffles options and preserves correct answer', () => {
  const pool = makePool(30);
  const selected = selectQuestions(pool);
  selected.forEach((q) => {
    assert(q.options.length === 3, 'Should have 3 options');
    assert(q.correctIndex >= 0 && q.correctIndex < 3, 'correctIndex should be valid');
    // The correct answer text should match the original correct option
    const originalCorrect = pool.find((p) => p.id === q.id).options[0];
    assert(q.options[q.correctIndex] === originalCorrect, 'Correct answer should be preserved after shuffle');
  });
});

test('replay produces a different question set (statistically)', () => {
  const pool = makePool(30);
  const set1 = selectQuestions(pool).map((q) => q.id).join(',');
  const set2 = selectQuestions(pool).map((q) => q.id).join(',');
  // Extremely unlikely to be identical
  assert(set1 !== set2, 'Two selections should differ (with overwhelming probability)');
});

test('full replay flow: reset → select → start → first question available', () => {
  const pool = makePool(30);

  // Simulate a completed game state
  GameState.questions = makePool(10);
  GameState.currentIndex = 10;
  GameState.score = 6;
  GameState.inProgress = false;

  // Replay: reset and start new game
  resetGameState();
  GameState.questions = selectQuestions(pool);
  markGameStarted();

  assert(GameState.questions.length === 10, 'Should have 10 questions');
  assert(GameState.currentIndex === 0, 'Should start at index 0');
  assert(GameState.score === 0, 'Score should be reset to 0');
  assert(GameState.inProgress === true, 'Game should be in progress');
  assert(GameState.startedAt > 0, 'startedAt should be set');

  const firstQuestion = GameState.questions[0];
  assert(firstQuestion !== null, 'First question should exist');
  assert(firstQuestion.prompt !== undefined, 'First question should have a prompt');
  assert(firstQuestion.options.length === 3, 'First question should have 3 options');
});

test('replay response time is under 2s', () => {
  const pool = makePool(30);
  resetGameState();

  const start = performance.now();
  GameState.questions = selectQuestions(pool);
  markGameStarted();
  // Simulate rendering (no DOM in unit test, but selection is the heavy part)
  const firstQuestion = GameState.questions[0];
  const elapsed = performance.now() - start;

  assert(firstQuestion !== undefined, 'First question should be available');
  assert(elapsed < 2000, `Replay setup took ${elapsed}ms, should be < 2000ms`);
});
