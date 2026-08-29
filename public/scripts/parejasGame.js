'use strict';

/**
 * Round/game orchestration for the Parejas jurásicas mode, as driven by the
 * app shell (TRIOFSND-276, public/scripts/main.js) at runtime.
 *
 * Browser bridge: `src/game/parejasGame.js` (TRIOFSND-273) already
 * implements this exact orchestration, but it unconditionally `require`s
 * `src/data/creatureSheet` and `src/data/questionBank` -- both transitively
 * `require('fs')` to read the question bank off disk, which does not exist
 * in a real, unbundled browser. That module stays as-is (it is still the
 * Node/Jest reference implementation, exercised by
 * src/game/parejasGame.test.js against the real, verified creature fichas).
 *
 * This file is therefore a second, browser-runnable implementation of the
 * same round/game state machine and level-unlock chain, following the exact
 * precedent public/scripts/mazeGame.js/classifyGame.js set: it resolves
 * `scoring`/`gameFlow`/`modesCatalog` the same require-or-`window.DinoQuiz`
 * way every other public/scripts module does, and its local
 * `DINOSAUR_VISUAL_FAMILIES` below is a small, static mirror of
 * src/data/creatureSheet.js's `CREATURE_SHEETS` (`visualFamily` field only)
 * and src/data/questionBank.js's `VALID_DINOSAURS` -- the same table
 * public/scripts/mazeGame.js/classifyGame.js already mirror by hand for the
 * same reason. Keep all three in sync (guarded by
 * tests/pwa/parejas-game-browser.test.js). `validateCatalog` never needs a
 * local mirror of the >=8 creatures requirement itself: it delegates to
 * public/scripts/modesCatalog.js (already browser-safe, see that file's own
 * doc comment), the single source of truth for every mode's availability
 * gate.
 *
 * Registers on `window.DinoQuiz.game.parejas` (nested, so it never clobbers
 * gameFlow.js's own flat `window.DinoQuiz.game` properties, same as
 * `window.DinoQuiz.game.maze`/`window.DinoQuiz.game.classify`) for the
 * `<script>`-loaded PWA, and `module.exports` for Node/Jest -- consumed by
 * public/scripts/main.js's `resolveParejasGame`.
 */

(function () {
  var ROUNDS_PER_GAME = 10;
  var MODE_ID = 'parejas';

  // PRD: a board is always 8-16 cards, always complete pairs.
  var MIN_PAIRS = 4;
  var MAX_PAIRS = 8;
  var MIN_CARDS = MIN_PAIRS * 2;
  var MAX_CARDS = MAX_PAIRS * 2;

  // PRD: the interface must work at 375px width without horizontal scroll --
  // a board never lays out more than 4 columns.
  var MAX_COLUMNS = 4;

  // PRD hard limit: only 2 not-yet-matched cards may be face up at once.
  var MAX_VISIBLE_UNMATCHED = 2;

  var CARD_STATES = Object.freeze({
    HIDDEN: 'hidden',
    REVEALED: 'revealed',
    MATCHED: 'matched',
  });

  var DIFFICULTY_BIAS = Object.freeze({
    DIVERSE: 'diverse',
    SIMILAR: 'similar',
  });

  // From this level on, a board's decoys are biased toward sharing a visual
  // family (harder to tell apart at a glance) instead of being spread across
  // families (easy to tell apart even before flipping a single card).
  var SIMILARITY_LEVEL_THRESHOLD = 7;

  // Mirrors src/data/creatureSheet.js's CREATURE_SHEETS visualFamily field
  // and src/data/questionBank.js's VALID_DINOSAURS -- see the module doc
  // comment above for why this is a local, static duplicate instead of a
  // `require` (same table public/scripts/mazeGame.js's own DINOSAUR_DIETS
  // mirrors).
  var DINOSAUR_VISUAL_FAMILIES = Object.freeze({
    trex: 'biped_carnivore',
    triceratops: 'armored_quadruped',
    velociraptor: 'biped_carnivore',
    estegosaurio: 'armored_quadruped',
    braquiosaurio: 'long_neck_quadruped',
    ankylosaurus: 'armored_quadruped',
    pteranodon: 'flying_reptile',
    spinosaurus: 'biped_carnivore',
    dilophosaurus: 'biped_carnivore',
    pachycephalosaurus: 'biped_herbivore',
    compsognathus: 'biped_carnivore',
    diplodocus: 'long_neck_quadruped',
    iguanodon: 'biped_herbivore',
    parasaurolophus: 'biped_herbivore',
  });
  var DEFAULT_DINOSAUR_POOL = Object.freeze(Object.keys(DINOSAUR_VISUAL_FAMILIES));

  /** The local mirror's visualFamily for `id`, same shape as src/data/creatureSheet.js's `getCreatureVisualFamily`. */
  function getCreatureVisualFamily(id) {
    return DINOSAUR_VISUAL_FAMILIES[id];
  }

  /** Resolves public/scripts/scoring.js the require-or-window way every public/scripts module does. */
  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  /** Resolves public/scripts/gameFlow.js the same way. */
  function resolveGameFlow() {
    if (typeof require === 'function') {
      return require('./gameFlow');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game) || null;
  }

  /** Resolves public/scripts/modesCatalog.js the same way -- the single source of truth for the >=8 creatures gate. */
  function resolveModesCatalog() {
    if (typeof require === 'function') {
      return require('./modesCatalog');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.modesCatalog) || null;
  }

  /**
   * Whether the current creature catalog satisfies Parejas' own requirement
   * (>=8 creatures, declared once in modesCatalog.js's MODES_CATALOG --
   * never re-declared here). Returns `{ modeId, available, cause, details }`,
   * mirrors src/game/parejasGame.js's own `validateCatalog` exactly.
   */
  function validateCatalog(options) {
    options = options || {};
    var modesCatalog = resolveModesCatalog();
    var catalog = options.catalog || modesCatalog.buildCurrentResourceCatalog({ dinosaurs: options.dinosaurPool });
    return modesCatalog.evaluateModeAvailability(modesCatalog.getModeById(MODE_ID), catalog);
  }

  /** How many pairs (4-8) a board at `level` (1-10) should have -- grows with level, PRD: "escala la dificultad por número de parejas". */
  function pairCountForLevel(level) {
    var gameFlow = resolveGameFlow();
    if (!gameFlow.isValidLevel(level)) {
      throw new Error('level must be an integer between ' + gameFlow.MIN_LEVEL + ' and ' + gameFlow.MAX_LEVEL);
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
   * flags `softLimitReached` -- purely informational, never disables
   * `revealCard`/`resolveSelection`. Generous at low levels, tightens to
   * exactly `pairCount` (no slack) by the top level.
   */
  function softAttemptLimitForLevel(level, pairCount) {
    var gameFlow = resolveGameFlow();
    var easeFactor = Math.max(0, gameFlow.MAX_LEVEL - level) / gameFlow.MAX_LEVEL;
    return pairCount + Math.round(pairCount * easeFactor);
  }

  /** From this level on, decoys are drawn preferentially from the same visual family (PRD: "similitud visual"). */
  function difficultyBiasForLevel(level) {
    return Number.isInteger(level) && level >= SIMILARITY_LEVEL_THRESHOLD ? DIFFICULTY_BIAS.SIMILAR : DIFFICULTY_BIAS.DIVERSE;
  }

  /** Groups `pool` by `getFamily(id)`, preserving each creature's pool order within its group. */
  function groupByVisualFamily(pool, getFamily) {
    var groups = {};
    var order = [];
    pool.forEach(function (id) {
      var family = getFamily(id) || 'unclassified';
      if (!Object.prototype.hasOwnProperty.call(groups, family)) {
        groups[family] = [];
        order.push(family);
      }
      groups[family].push(id);
    });
    return { groups: groups, order: order };
  }

  /** Round-robins shuffled per-family queues, so consecutive picks rarely share a family -- an easy-to-tell-apart board. */
  function orderForDiversity(grouped, randomFn) {
    var gameFlow = resolveGameFlow();
    var families = gameFlow.shuffle(grouped.order.slice(), randomFn);
    var queues = families.map(function (family) {
      return gameFlow.shuffle(grouped.groups[family].slice(), randomFn);
    });
    var ordered = [];
    var pickedAny = true;
    while (pickedAny) {
      pickedAny = false;
      queues.forEach(function (queue) {
        if (queue.length > 0) {
          ordered.push(queue.shift());
          pickedAny = true;
        }
      });
    }
    return ordered;
  }

  /** Largest visual families first (each shuffled internally), so a board's leading creatures cluster into look-alike groups. */
  function orderForSimilarity(grouped, randomFn) {
    var gameFlow = resolveGameFlow();
    var families = grouped.order.slice().sort(function (a, b) {
      return grouped.groups[b].length - grouped.groups[a].length;
    });
    var ordered = [];
    families.forEach(function (family) {
      ordered.push.apply(ordered, gameFlow.shuffle(grouped.groups[family].slice(), randomFn));
    });
    return ordered;
  }

  /**
   * Picks `pairCount` distinct creatures from `options.dinosaurPool`
   * (defaults to `DEFAULT_DINOSAUR_POOL`), biased by
   * `difficultyBiasForLevel(options.level)`: diverse (spread across visual
   * families) below `SIMILARITY_LEVEL_THRESHOLD`, clustered by family
   * (visually similar decoys) at/above it. Throws if the pool doesn't have
   * `pairCount` distinct creatures rather than guessing.
   */
  function selectCreaturesForBoard(options) {
    options = options || {};
    var pairCount = options.pairCount;
    var level = options.level;
    var pool = options.dinosaurPool || DEFAULT_DINOSAUR_POOL;
    var randomFn = options.randomFn || Math.random;
    var getFamily = options.getCreatureVisualFamily || getCreatureVisualFamily;

    if (!Number.isInteger(pairCount) || pairCount < MIN_PAIRS || pairCount > MAX_PAIRS) {
      throw new Error('pairCount must be an integer between ' + MIN_PAIRS + ' and ' + MAX_PAIRS);
    }
    if (!Array.isArray(pool) || pool.length < pairCount) {
      throw new Error('dinosaurPool needs at least ' + pairCount + ' distinct creatures, has ' + (Array.isArray(pool) ? pool.length : 0));
    }

    var grouped = groupByVisualFamily(pool, getFamily);
    var ordered = difficultyBiasForLevel(level) === DIFFICULTY_BIAS.SIMILAR
      ? orderForSimilarity(grouped, randomFn)
      : orderForDiversity(grouped, randomFn);

    return ordered.slice(0, pairCount);
  }

  /** Builds the shuffled, positioned card list (two cards per creature) for a board of `creatureIds.length` pairs. */
  function buildShuffledCards(creatureIds, randomFn) {
    var gameFlow = resolveGameFlow();
    var unshuffled = [];
    creatureIds.forEach(function (creatureId, pairId) {
      unshuffled.push({ creatureId: creatureId, pairId: pairId });
      unshuffled.push({ creatureId: creatureId, pairId: pairId });
    });

    var shuffled = gameFlow.shuffle(unshuffled, randomFn);
    var columns = computeColumns(shuffled.length);

    return shuffled.map(function (entry, cardId) {
      return {
        cardId: cardId,
        creatureId: entry.creatureId,
        pairId: entry.pairId,
        state: CARD_STATES.HIDDEN,
        position: { row: Math.floor(cardId / columns), col: cardId % columns },
      };
    });
  }

  function findCard(round, cardId) {
    return round.cards.filter(function (card) {
      return card.cardId === cardId;
    })[0];
  }

  /**
   * Starts round `roundIndex` (0-based, < ROUNDS_PER_GAME): resolves the
   * board's pair count and visual-similarity bias from `level`
   * (`pairCountForLevel`/`difficultyBiasForLevel`), then deals a fresh,
   * all-hidden, shuffled board. Mirrors src/game/parejasGame.js's own
   * `startRound`.
   */
  function startRound(options) {
    options = options || {};
    var roundIndex = options.roundIndex;
    var level = options.level;
    var gameFlow = resolveGameFlow();

    if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUNDS_PER_GAME) {
      throw new Error('roundIndex must be an integer between 0 and ' + (ROUNDS_PER_GAME - 1));
    }
    if (!gameFlow.isValidLevel(level)) {
      throw new Error('level must be an integer between ' + gameFlow.MIN_LEVEL + ' and ' + gameFlow.MAX_LEVEL);
    }

    var randomFn = options.randomFn || Math.random;
    var pairCount = pairCountForLevel(level);
    var creatureIds = selectCreaturesForBoard({
      pairCount: pairCount,
      level: level,
      dinosaurPool: options.dinosaurPool,
      randomFn: randomFn,
      getCreatureVisualFamily: options.getCreatureVisualFamily,
    });
    var cards = buildShuffledCards(creatureIds, randomFn);
    var columns = computeColumns(cards.length);

    return {
      roundIndex: roundIndex,
      level: level,
      seed: options.seed + ':' + roundIndex,
      pairCount: pairCount,
      columns: columns,
      rows: Math.ceil(cards.length / columns),
      cards: cards,
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
   * `cardId`, or a card that is already `'revealed'`/`'matched'` is a no-op.
   * Otherwise: with fewer than MAX_VISIBLE_UNMATCHED cards already face up,
   * the card flips to `'revealed'`; at the hard limit, the reveal is refused
   * (`blocked: true`). Mirrors src/game/parejasGame.js's own `revealCard`.
   */
  function revealCard(round, cardId) {
    if (!round || round.status !== 'playing') {
      return round;
    }

    var card = findCard(round, cardId);
    if (!card || card.state !== CARD_STATES.HIDDEN) {
      return round;
    }

    if (round.revealedCardIds.length >= MAX_VISIBLE_UNMATCHED) {
      return Object.assign({}, round, { blocked: true });
    }

    var cards = round.cards.map(function (entry) {
      return entry.cardId === cardId ? Object.assign({}, entry, { state: CARD_STATES.REVEALED }) : entry;
    });

    return Object.assign({}, round, {
      cards: cards,
      revealedCardIds: round.revealedCardIds.concat([cardId]),
      blocked: false,
    });
  }

  /**
   * Once MAX_VISIBLE_UNMATCHED cards are face up, compares them: a match
   * flips both to `'matched'`; a mismatch flips both back to `'hidden'`.
   * `softLimitReached` is a non-blocking flag only. Once every pair is
   * matched, `status` becomes `'completed'`. Mirrors
   * src/game/parejasGame.js's own `resolveSelection`.
   */
  function resolveSelection(round) {
    if (!round || round.revealedCardIds.length !== MAX_VISIBLE_UNMATCHED) {
      return round;
    }

    var firstId = round.revealedCardIds[0];
    var secondId = round.revealedCardIds[1];
    var isMatch = findCard(round, firstId).creatureId === findCard(round, secondId).creatureId;
    var attempts = round.attempts + 1;
    var matchedPairs = round.matchedPairs + (isMatch ? 1 : 0);

    var cards = round.cards.map(function (entry) {
      if (entry.cardId !== firstId && entry.cardId !== secondId) {
        return entry;
      }
      return Object.assign({}, entry, { state: isMatch ? CARD_STATES.MATCHED : CARD_STATES.HIDDEN });
    });

    return Object.assign({}, round, {
      cards: cards,
      revealedCardIds: [],
      attempts: attempts,
      mismatches: round.mismatches + (isMatch ? 0 : 1),
      matchedPairs: matchedPairs,
      lastMatch: isMatch,
      softLimitReached: attempts >= round.softAttemptLimit,
      status: matchedPairs === round.pairCount ? 'completed' : 'playing',
    });
  }

  /**
   * Scores a round exactly once, the moment every pair is matched (throws if
   * called before that); a second call on an already-evaluated round is a
   * no-op. Completing the board is always a success for the mode's own
   * score (there is no "wrong" board outcome, only slower/faster) -- see
   * `completeLevel`'s own doc comment for how the common aciertos tally
   * differs from this. Mirrors src/game/parejasGame.js's own `evaluateRound`.
   */
  function evaluateRound(round, gameState) {
    if (round && round.evaluated) {
      return { round: round, gameState: gameState };
    }

    if (!round || round.status !== 'completed') {
      throw new Error('evaluateRound requires a round whose status is "completed"');
    }

    var scoring = resolveScoring();
    var scored = scoring.applyAnswer(gameState.score, true);
    var answer = {
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
   * own >=8 creatures requirement) and returns `{ error, details }` instead
   * of starting a game the catalog can't support. Otherwise mirrors
   * gameFlow.js's own initial state shape plus the first of ROUNDS_PER_GAME
   * rounds. Mirrors src/game/parejasGame.js's own `startGame`.
   */
  function startGame(options) {
    options = options || {};
    var level = options.level;
    var gameFlow = resolveGameFlow();

    if (!gameFlow.isValidLevel(level)) {
      throw new Error('level must be an integer between ' + gameFlow.MIN_LEVEL + ' and ' + gameFlow.MAX_LEVEL);
    }

    var availability = validateCatalog(options);
    if (!availability.available) {
      return { error: availability.cause, details: availability.details };
    }

    return {
      level: level,
      seed: options.seed,
      state: gameFlow.createInitialGameState(),
      round: startRound({
        roundIndex: 0,
        level: level,
        seed: options.seed,
        dinosaurPool: options.dinosaurPool,
        randomFn: options.randomFn,
        getCreatureVisualFamily: options.getCreatureVisualFamily,
      }),
    };
  }

  /**
   * Composes `evaluateRound` with `startRound` for the next round: scores
   * the just-finished round and, unless it was the game's last round, also
   * starts the next one, attached as `nextRound`. Mirrors
   * src/game/parejasGame.js's own `completeRound`.
   */
  function completeRound(params) {
    params = params || {};
    var round = params.round;
    var gameState = params.gameState;
    var level = params.level;
    var seed = params.seed;

    var evaluated = evaluateRound(round, gameState);
    var nextRoundIndex = evaluated.round.roundIndex + 1;

    if (nextRoundIndex >= ROUNDS_PER_GAME) {
      return { gameOver: true, round: evaluated.round, state: evaluated.gameState };
    }

    return {
      gameOver: false,
      round: evaluated.round,
      state: evaluated.gameState,
      nextRound: startRound({
        roundIndex: nextRoundIndex,
        level: level,
        seed: seed,
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
   * next level unlocks, also starts it (attached as `nextLevelGame`).
   * Mirrors src/game/parejasGame.js's own `completeLevel`/
   * shadowGuessGame.js's own `completeLevel` exactly.
   *
   * A round only counts toward the common aciertos/unlock tally when its
   * board was completed without exceeding the level's soft attempt limit
   * (PRD: "El porcentaje final es rondas acertadas / 10 x 100") -- never the
   * mode's own always-succeeds `isCorrect`/score (see `evaluateRound`'s doc
   * comment).
   */
  function completeLevel(params) {
    params = params || {};
    var gameFlow = resolveGameFlow();
    var answers = (params.answers || []).map(function (answer) {
      return { isCorrect: Boolean(answer && answer.isCorrect) && !(answer && answer.softLimitReached) };
    });

    var outcome = gameFlow.resolveLevelOutcome({
      level: params.level,
      answers: answers,
      modeId: MODE_ID,
    });

    if (outcome.gameOver) {
      return outcome;
    }

    outcome.nextLevelGame = startGame(Object.assign({}, params, { level: outcome.nextLevel }));
    return outcome;
  }

  var api = {
    ROUNDS_PER_GAME: ROUNDS_PER_GAME,
    MODE_ID: MODE_ID,
    MIN_PAIRS: MIN_PAIRS,
    MAX_PAIRS: MAX_PAIRS,
    MIN_CARDS: MIN_CARDS,
    MAX_CARDS: MAX_CARDS,
    MAX_COLUMNS: MAX_COLUMNS,
    MAX_VISIBLE_UNMATCHED: MAX_VISIBLE_UNMATCHED,
    CARD_STATES: CARD_STATES,
    DIFFICULTY_BIAS: DIFFICULTY_BIAS,
    DEFAULT_DINOSAUR_POOL: DEFAULT_DINOSAUR_POOL,
    DINOSAUR_VISUAL_FAMILIES: DINOSAUR_VISUAL_FAMILIES,
    getCreatureVisualFamily: getCreatureVisualFamily,
    validateCatalog: validateCatalog,
    pairCountForLevel: pairCountForLevel,
    computeColumns: computeColumns,
    softAttemptLimitForLevel: softAttemptLimitForLevel,
    difficultyBiasForLevel: difficultyBiasForLevel,
    selectCreaturesForBoard: selectCreaturesForBoard,
    startRound: startRound,
    revealCard: revealCard,
    resolveSelection: resolveSelection,
    evaluateRound: evaluateRound,
    startGame: startGame,
    completeRound: completeRound,
    completeLevel: completeLevel,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.parejas = api;
  }
})();
