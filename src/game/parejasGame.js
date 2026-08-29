'use strict';

/**
 * Round logic for the Parejas jurásicas game mode (TRIOFSND-273): catalog
 * validation, board generation, the per-card state machine and per-round
 * evaluation, orchestrated on top of `modesCatalog.js` (the >=8 creatures
 * requirement, already declared for this mode), `scoring.js` (points) and
 * `gameFlow.js` (the running game state shape/round advance) -- mirrors
 * mazeGame.js so Parejas reuses the same primitives as Quiz/Laberinto
 * instead of a parallel scoring/progress implementation.
 *
 * A game is exactly ROUNDS_PER_GAME (10) rounds, mirrors gameFlow.js's
 * QUESTIONS_PER_GAME. Each round is one memory board:
 *   1. `startRound` resolves how many pairs the board needs
 *      (`pairCountForLevel`, 4-8 pairs / 8-16 cards -- PRD: max 4 columns at
 *      375px, `computeColumns`), picks that many distinct creatures
 *      (`selectCreaturesForBoard`, biasing toward creatures that share a
 *      visual family -- `creatureSheet.js`'s `visualFamily` -- as the level
 *      rises) and shuffles two cards per creature into the grid.
 *   2. `revealCard` flips one card face up at a time, enforcing the hard
 *      rule that at most MAX_VISIBLE_UNMATCHED (2) not-yet-matched cards can
 *      be face up together: a third reveal attempt is refused (`blocked:
 *      true`) until the two already up are resolved.
 *   3. `resolveSelection` compares the two revealed cards once both are up:
 *      a match flips them to `'matched'` and tallies `matchedPairs`; a
 *      mismatch flips them back to `'hidden'` and only tallies
 *      `attempts`/`mismatches` -- a soft counter (`softLimitReached`) that
 *      never blocks another reveal (PRD: "límites suaves de intentos que
 *      nunca bloquean el avance").
 *   4. Once every pair is matched the round's `status` becomes
 *      `'completed'`; `evaluateRound` scores it exactly once
 *      (`round.evaluated` guards a second call from double-scoring) via
 *      `scoring.applyAnswer` -- finishing the board is always a success,
 *      the same way reaching Laberinto's goal always is -- and appends the
 *      round's outcome to `gameState.answers` (the same shape gameFlow.js's
 *      `calculateMaxStreak` already knows how to fold over).
 *
 * Creature diet/size/period are never re-derived or duplicated here: this
 * module only ever reads a creature's `id` and `visualFamily` (via
 * `creatureSheet.js`) to decide which cards look alike, and only ever calls
 * into `scoring.js`/`gameFlow.js` for anything score/progress related.
 */

const scoring = require('./scoring');
const gameFlow = require('./gameFlow');
const { getCreatureVisualFamily } = require('../data/creatureSheet');
const { VALID_DINOSAURS } = require('../data/questionBank');
const { MODE_IDS, getModeById, evaluateModeAvailability, buildCurrentResourceCatalog } = require('./modesCatalog');

const ROUNDS_PER_GAME = 10;
const MODE_ID = MODE_IDS.PAREJAS;

// PRD: a board is always 8-16 cards, always complete pairs.
const MIN_PAIRS = 4;
const MAX_PAIRS = 8;
const MIN_CARDS = MIN_PAIRS * 2;
const MAX_CARDS = MAX_PAIRS * 2;

// PRD: the interface must work at 375px width without horizontal scroll --
// a board never lays out more than 4 columns.
const MAX_COLUMNS = 4;

// PRD hard limit: only 2 not-yet-matched cards may be face up at once.
const MAX_VISIBLE_UNMATCHED = 2;

const CARD_STATES = Object.freeze({
  HIDDEN: 'hidden',
  REVEALED: 'revealed',
  MATCHED: 'matched',
});

const DIFFICULTY_BIAS = Object.freeze({
  DIVERSE: 'diverse',
  SIMILAR: 'similar',
});

// From this level on, a board's decoys are biased toward sharing a visual
// family (harder to tell apart at a glance) instead of being spread across
// families (easy to tell apart even before flipping a single card).
const SIMILARITY_LEVEL_THRESHOLD = 7;

/**
 * Whether the current creature catalog satisfies Parejas' own requirement
 * (>=8 creatures, declared once in `modesCatalog.js`'s MODES_CATALOG --
 * never re-declared here). Returns `{ modeId, available, cause, details }`;
 * `cause` is the machine-readable block reason
 * (`modesCatalog.js`'s AVAILABILITY_CAUSES) a caller can log/display when
 * `available` is false, exactly like every other mode's availability check.
 */
function validateCatalog(options) {
  options = options || {};
  const catalog = options.catalog || buildCurrentResourceCatalog({ dinosaurs: options.dinosaurPool });
  return evaluateModeAvailability(getModeById(MODE_ID), catalog);
}

/** How many pairs (4-8) a board at `level` (1-10) should have -- grows with level, PRD: "escala la dificultad por número de parejas". */
function pairCountForLevel(level) {
  if (!gameFlow.isValidLevel(level)) {
    throw new Error(`level must be an integer between ${gameFlow.MIN_LEVEL} and ${gameFlow.MAX_LEVEL}`);
  }
  return MIN_PAIRS + Math.floor((level - 1) / 2);
}

/** Never more than MAX_COLUMNS (PRD: 375px width), never more than the board itself has cards. */
function computeColumns(cardCount) {
  return Math.max(1, Math.min(MAX_COLUMNS, cardCount));
}

/**
 * The soft, non-blocking attempt threshold (PRD: "límites suaves de
 * intentos que nunca bloquean el avance") above which `resolveSelection`
 * flags `softLimitReached` -- purely informational (e.g. a UI hint), never
 * disables `revealCard`/`resolveSelection`. Generous at low levels, tightens
 * to exactly `pairCount` (no slack) by the top level.
 */
function softAttemptLimitForLevel(level, pairCount) {
  const easeFactor = Math.max(0, gameFlow.MAX_LEVEL - level) / gameFlow.MAX_LEVEL;
  return pairCount + Math.round(pairCount * easeFactor);
}

/** From this level on, decoys are drawn preferentially from the same visual family (PRD: "similitud visual"). */
function difficultyBiasForLevel(level) {
  return Number.isInteger(level) && level >= SIMILARITY_LEVEL_THRESHOLD ? DIFFICULTY_BIAS.SIMILAR : DIFFICULTY_BIAS.DIVERSE;
}

/** Groups `pool` by `getFamily(id)`, preserving each creature's pool order within its group. */
function groupByVisualFamily(pool, getFamily) {
  const groups = new Map();
  pool.forEach((id) => {
    const family = getFamily(id) || 'unclassified';
    if (!groups.has(family)) {
      groups.set(family, []);
    }
    groups.get(family).push(id);
  });
  return groups;
}

/** Round-robins shuffled per-family queues, so consecutive picks rarely share a family -- an easy-to-tell-apart board. */
function orderForDiversity(groups, randomFn) {
  const families = gameFlow.shuffle(Array.from(groups.keys()), randomFn);
  const queues = families.map((family) => gameFlow.shuffle(groups.get(family), randomFn));
  const ordered = [];
  let pickedAny = true;
  while (pickedAny) {
    pickedAny = false;
    queues.forEach((queue) => {
      if (queue.length > 0) {
        ordered.push(queue.shift());
        pickedAny = true;
      }
    });
  }
  return ordered;
}

/** Largest visual families first (each shuffled internally), so a board's leading creatures cluster into look-alike groups. */
function orderForSimilarity(groups, randomFn) {
  const families = Array.from(groups.keys()).sort((a, b) => groups.get(b).length - groups.get(a).length);
  const ordered = [];
  families.forEach((family) => {
    ordered.push(...gameFlow.shuffle(groups.get(family), randomFn));
  });
  return ordered;
}

/**
 * Picks `pairCount` distinct creatures from `options.dinosaurPool` (defaults
 * to `VALID_DINOSAURS`), biased by `difficultyBiasForLevel(options.level)`:
 * diverse (spread across visual families) below `SIMILARITY_LEVEL_THRESHOLD`,
 * clustered by family (visually similar decoys) at/above it. Throws if the
 * pool doesn't have `pairCount` distinct creatures rather than guessing.
 */
function selectCreaturesForBoard(options) {
  options = options || {};
  const { pairCount, level } = options;
  const pool = options.dinosaurPool || VALID_DINOSAURS;
  const randomFn = options.randomFn || Math.random;
  const getFamily = options.getCreatureVisualFamily || getCreatureVisualFamily;

  if (!Number.isInteger(pairCount) || pairCount < MIN_PAIRS || pairCount > MAX_PAIRS) {
    throw new Error(`pairCount must be an integer between ${MIN_PAIRS} and ${MAX_PAIRS}`);
  }
  if (!Array.isArray(pool) || pool.length < pairCount) {
    throw new Error(`dinosaurPool needs at least ${pairCount} distinct creatures, has ${Array.isArray(pool) ? pool.length : 0}`);
  }

  const groups = groupByVisualFamily(pool, getFamily);
  const ordered = difficultyBiasForLevel(level) === DIFFICULTY_BIAS.SIMILAR
    ? orderForSimilarity(groups, randomFn)
    : orderForDiversity(groups, randomFn);

  return ordered.slice(0, pairCount);
}

/** Builds the shuffled, positioned card list (two cards per creature) for a board of `creatureIds.length` pairs. */
function buildShuffledCards(creatureIds, randomFn) {
  const unshuffled = [];
  creatureIds.forEach((creatureId, pairId) => {
    unshuffled.push({ creatureId, pairId });
    unshuffled.push({ creatureId, pairId });
  });

  const shuffled = gameFlow.shuffle(unshuffled, randomFn);
  const columns = computeColumns(shuffled.length);

  return shuffled.map((entry, cardId) => ({
    cardId,
    creatureId: entry.creatureId,
    pairId: entry.pairId,
    state: CARD_STATES.HIDDEN,
    position: { row: Math.floor(cardId / columns), col: cardId % columns },
  }));
}

function findCard(round, cardId) {
  return round.cards.filter((card) => card.cardId === cardId)[0];
}

/**
 * Starts round `roundIndex` (0-based, < ROUNDS_PER_GAME): resolves the
 * board's pair count and visual-similarity bias from `level`
 * (`pairCountForLevel`/`difficultyBiasForLevel`), then deals a fresh,
 * all-hidden, shuffled board.
 */
function startRound(options) {
  options = options || {};
  const { roundIndex, level } = options;

  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
    throw new Error(`roundIndex must be an integer between 0 and ${ROUNDS_PER_GAME - 1}`);
  }
  if (!gameFlow.isValidLevel(level)) {
    throw new Error(`level must be an integer between ${gameFlow.MIN_LEVEL} and ${gameFlow.MAX_LEVEL}`);
  }

  const randomFn = options.randomFn || Math.random;
  const pairCount = pairCountForLevel(level);
  const creatureIds = selectCreaturesForBoard({
    pairCount,
    level,
    dinosaurPool: options.dinosaurPool,
    randomFn,
    getCreatureVisualFamily: options.getCreatureVisualFamily,
  });
  const cards = buildShuffledCards(creatureIds, randomFn);

  return {
    roundIndex,
    level,
    seed: `${options.seed}:${roundIndex}`,
    pairCount,
    columns: computeColumns(cards.length),
    rows: Math.ceil(cards.length / computeColumns(cards.length)),
    cards,
    revealedCardIds: [],
    matchedPairs: 0,
    attempts: 0,
    mismatches: 0,
    softAttemptLimit: softAttemptLimitForLevel(level, pairCount),
    softLimitReached: false,
    status: 'playing',
    blocked: false,
    evaluated: false,
  };
}

/**
 * Flips one card face up. A round that is not `'playing'`, an unknown
 * `cardId`, or a card that is already `'revealed'`/`'matched'` is a no-op
 * (returns `round` unchanged). Otherwise: with fewer than
 * MAX_VISIBLE_UNMATCHED cards already face up, the card flips to
 * `'revealed'` (`blocked: false`); at the hard limit, the reveal is refused
 * (`blocked: true`, no state change) -- the caller must `resolveSelection`
 * the two already up before a third can be flipped.
 */
function revealCard(round, cardId) {
  if (!round || round.status !== 'playing') {
    return round;
  }

  const card = findCard(round, cardId);
  if (!card || card.state !== CARD_STATES.HIDDEN) {
    return round;
  }

  if (round.revealedCardIds.length >= MAX_VISIBLE_UNMATCHED) {
    return Object.assign({}, round, { blocked: true });
  }

  const cards = round.cards.map((entry) =>
    (entry.cardId === cardId ? Object.assign({}, entry, { state: CARD_STATES.REVEALED }) : entry)
  );

  return Object.assign({}, round, {
    cards,
    revealedCardIds: round.revealedCardIds.concat([cardId]),
    blocked: false,
  });
}

/**
 * Once MAX_VISIBLE_UNMATCHED cards are face up, compares them: a match
 * flips both to `'matched'` and tallies `matchedPairs`; a mismatch flips
 * both back to `'hidden'`. Either way `attempts` (and, on a mismatch,
 * `mismatches`) increments and `revealedCardIds` clears, so the next
 * `revealCard` can flip a new pair. `softLimitReached` is a non-blocking
 * flag only (PRD: soft attempt limits never block progress). No-op
 * (returns `round` unchanged) unless exactly MAX_VISIBLE_UNMATCHED cards
 * are currently revealed. Once every pair is matched, `status` becomes
 * `'completed'`.
 */
function resolveSelection(round) {
  if (!round || round.revealedCardIds.length !== MAX_VISIBLE_UNMATCHED) {
    return round;
  }

  const [firstId, secondId] = round.revealedCardIds;
  const isMatch = findCard(round, firstId).creatureId === findCard(round, secondId).creatureId;
  const attempts = round.attempts + 1;
  const matchedPairs = round.matchedPairs + (isMatch ? 1 : 0);

  const cards = round.cards.map((entry) => {
    if (entry.cardId !== firstId && entry.cardId !== secondId) {
      return entry;
    }
    return Object.assign({}, entry, { state: isMatch ? CARD_STATES.MATCHED : CARD_STATES.HIDDEN });
  });

  return Object.assign({}, round, {
    cards,
    revealedCardIds: [],
    attempts,
    mismatches: round.mismatches + (isMatch ? 0 : 1),
    matchedPairs,
    lastMatch: isMatch,
    softLimitReached: attempts >= round.softAttemptLimit,
    status: matchedPairs === round.pairCount ? 'completed' : 'playing',
  });
}

/**
 * Scores a round exactly once, the moment every pair is matched (throws if
 * called before that). A second call on an already-evaluated round is a
 * no-op that returns the same round/gameState untouched, so a caller that
 * accidentally re-evaluates never double-scores.
 *
 * Completing the board is always a success (there is no "wrong" board
 * outcome, only slower/faster), so this always applies
 * `scoring.applyAnswer(gameState.score, true)` -- reused from the same
 * scoring module Quiz/Laberinto apply their answers with -- and appends an
 * answer entry shaped like gameFlow.js's `answers` (`isCorrect: true`), so
 * `gameFlow.calculateMaxStreak` folds over Parejas rounds unchanged.
 */
function evaluateRound(round, gameState) {
  if (round && round.evaluated) {
    return { round, gameState };
  }

  if (!round || round.status !== 'completed') {
    throw new Error('evaluateRound requires a round whose status is "completed"');
  }

  const scored = scoring.applyAnswer(gameState.score, true);
  const answer = {
    roundIndex: round.roundIndex,
    pairCount: round.pairCount,
    attempts: round.attempts,
    mismatches: round.mismatches,
    softLimitReached: round.softLimitReached,
    isCorrect: true,
  };

  return {
    round: Object.assign({}, round, { evaluated: true }),
    gameState: {
      score: scored.score,
      questionIndex: gameState.questionIndex + 1,
      answers: gameState.answers.concat([answer]),
    },
  };
}

/**
 * Starts a fresh Parejas game: first checks `validateCatalog` (the mode's
 * own >=8 creatures requirement) and returns `{ error, details }` instead of
 * starting a game the catalog can't support. Otherwise mirrors mazeGame.js's
 * `startGame`: gameFlow.js's own initial state shape (reused verbatim) plus
 * the first of ROUNDS_PER_GAME rounds. `options.level` must be a valid
 * gameFlow.js level (1-10); `options.seed` seeds every round's shuffle
 * deterministically.
 */
function startGame(options) {
  options = options || {};
  const { level } = options;

  if (!gameFlow.isValidLevel(level)) {
    throw new Error(`level must be an integer between ${gameFlow.MIN_LEVEL} and ${gameFlow.MAX_LEVEL}`);
  }

  const availability = validateCatalog(options);
  if (!availability.available) {
    return { error: availability.cause, details: availability.details };
  }

  return {
    level,
    seed: options.seed,
    state: gameFlow.createInitialGameState(),
    round: startRound({
      roundIndex: 0,
      level,
      seed: options.seed,
      dinosaurPool: options.dinosaurPool,
      randomFn: options.randomFn,
      getCreatureVisualFamily: options.getCreatureVisualFamily,
    }),
  };
}

/**
 * Composes `evaluateRound` with `startRound` for the next round (mirrors
 * mazeGame.js's `completeRound`): scores the just-finished round and, unless
 * it was the game's last round (ROUNDS_PER_GAME), also starts round
 * `round.roundIndex + 1`, attached as `nextRound`, so a caller advances a
 * full round in one call.
 */
function completeRound(params) {
  params = params || {};
  const { round, gameState, level, seed } = params;
  const evaluated = evaluateRound(round, gameState);
  const nextRoundIndex = evaluated.round.roundIndex + 1;

  if (nextRoundIndex >= ROUNDS_PER_GAME) {
    return { gameOver: true, round: evaluated.round, state: evaluated.gameState };
  }

  return {
    gameOver: false,
    round: evaluated.round,
    state: evaluated.gameState,
    nextRound: startRound({
      roundIndex: nextRoundIndex,
      level,
      seed,
      dinosaurPool: params.dinosaurPool,
      randomFn: params.randomFn,
      getCreatureVisualFamily: params.getCreatureVisualFamily,
    }),
  };
}

/**
 * Composes `gameFlow.resolveLevelOutcome` (scoped to Parejas' own
 * unlockThresholds.js entry, MODE_ID) with `startGame`: resolves what
 * happens once a level's ROUNDS_PER_GAME rounds are all played and, when a
 * next level unlocks, also starts it (attached as `nextLevelGame`). Mirrors
 * shadowGuessGame.js's own `completeLevel` exactly.
 *
 * A round only counts toward the common aciertos/unlock tally
 * (`params.answers`, `state.answers` as produced by `evaluateRound`) when its
 * board was completed without exceeding the level's soft attempt limit (PRD:
 * "El porcentaje final es rondas acertadas / 10 x 100") -- never the mode's
 * own always-succeeds `isCorrect`/`state.score` (see `evaluateRound`'s doc
 * comment on why completing a board is always a success for the mode's own
 * scoring, regardless of how many attempts it took).
 */
function completeLevel(params) {
  params = params || {};
  const answers = (params.answers || []).map((answer) => ({
    isCorrect: Boolean(answer && answer.isCorrect) && !(answer && answer.softLimitReached),
  }));

  const outcome = gameFlow.resolveLevelOutcome({
    level: params.level,
    answers,
    modeId: MODE_ID,
  });

  if (outcome.gameOver) {
    return outcome;
  }

  outcome.nextLevelGame = startGame(Object.assign({}, params, { level: outcome.nextLevel }));
  return outcome;
}

module.exports = {
  ROUNDS_PER_GAME,
  MODE_ID,
  MIN_PAIRS,
  MAX_PAIRS,
  MIN_CARDS,
  MAX_CARDS,
  MAX_COLUMNS,
  MAX_VISIBLE_UNMATCHED,
  CARD_STATES,
  DIFFICULTY_BIAS,
  validateCatalog,
  pairCountForLevel,
  computeColumns,
  softAttemptLimitForLevel,
  difficultyBiasForLevel,
  selectCreaturesForBoard,
  startRound,
  revealCard,
  resolveSelection,
  evaluateRound,
  startGame,
  completeRound,
  completeLevel,
};
