'use strict';

const {
  ROUNDS_PER_GAME,
  MODE_ID,
  FOODS,
  MOVE_DIRECTIONS,
  getGoalFood,
  pickDinosaur,
  startRound,
  applyMove,
  evaluateRound,
  startGame,
  completeRound,
} = require('./mazeGame');
const { DINOSAURS, VALID_DINOSAURS } = require('../data/questionBank');
const { DIETS } = require('../data/creatureSheet');

function buildMemoryLogService() {
  const events = [];
  return {
    events,
    logEvent(eventType, metadata) {
      events.push({ eventType, metadata });
    },
  };
}

/** Fixed 2x2 grid: (0,0)-(0,1) open (E/W), (0,0)-(1,0) walled, goal at (1,1) unreachable via a single move -- built by hand so movement tests never depend on generateMaze's randomness. */
function buildFixedRound(overrides = {}) {
  const grid = [
    [
      { row: 0, col: 0, walls: { N: true, S: true, E: false, W: true } },
      { row: 0, col: 1, walls: { N: true, S: false, E: true, W: false } },
    ],
    [
      { row: 1, col: 0, walls: { N: true, S: true, E: true, W: true } },
      { row: 1, col: 1, walls: { N: false, S: true, E: true, W: true } },
    ],
  ];
  const maze = { seed: 'fixed', level: 1, width: 2, height: 2, grid, start: { row: 0, col: 0 }, goal: { row: 1, col: 1 } };

  return {
    roundIndex: 0,
    level: 1,
    seed: 'fixed:0',
    dinosaur: DINOSAURS.TREX,
    diet: DIETS.CARNIVORO,
    food: FOODS.MEAT,
    maze,
    position: { row: 0, col: 0 },
    moves: 0,
    status: 'playing',
    blocked: false,
    evaluated: false,
    ...overrides,
  };
}

describe('getGoalFood', () => {
  test('resolves carne/hojas/mixto exclusively from the creature diet map', () => {
    expect(getGoalFood(DINOSAURS.TREX)).toEqual({ diet: DIETS.CARNIVORO, food: FOODS.MEAT });
    expect(getGoalFood(DINOSAURS.TRICERATOPS)).toEqual({ diet: DIETS.HERBIVORO, food: FOODS.LEAVES });
  });

  test('resolves the mixed prize for an omnivore, via an injected creature sheet', () => {
    const getCreatureSheet = (id) => (id === 'gallimimus' ? { id, diet: DIETS.OMNIVORO } : undefined);
    expect(getGoalFood('gallimimus', { getCreatureSheet })).toEqual({ diet: DIETS.OMNIVORO, food: FOODS.MIXED });
  });

  test('throws instead of guessing a diet for a creature with no verified card', () => {
    expect(() => getGoalFood('unknown-creature')).toThrow();
  });
});

describe('pickDinosaur', () => {
  test('never repeats the previous round creature when the pool has another option', () => {
    const pool = [DINOSAURS.TREX, DINOSAURS.TRICERATOPS];
    for (let i = 0; i < 20; i += 1) {
      const picked = pickDinosaur(DINOSAURS.TREX, { dinosaurPool: pool, randomFn: () => i / 20 });
      expect(picked).toBe(DINOSAURS.TRICERATOPS);
    }
  });

  test('falls back to the only pool member when there is no alternative', () => {
    expect(pickDinosaur(DINOSAURS.TREX, { dinosaurPool: [DINOSAURS.TREX], randomFn: () => 0 })).toBe(DINOSAURS.TREX);
  });

  test('defaults to the shipped dinosaur roster', () => {
    const picked = pickDinosaur(null, { randomFn: () => 0 });
    expect(VALID_DINOSAURS).toContain(picked);
  });
});

describe('startRound', () => {
  test('rejects a roundIndex outside 0..ROUNDS_PER_GAME-1', () => {
    expect(() => startRound({ roundIndex: -1, level: 1, seed: 's' })).toThrow();
    expect(() => startRound({ roundIndex: ROUNDS_PER_GAME, level: 1, seed: 's' })).toThrow();
  });

  test('returns a round positioned at the maze start with the creature goal food attached', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 'seed-1', randomFn: () => 0 });

    expect(round.error).toBeUndefined();
    expect(round.roundIndex).toBe(0);
    expect(round.status).toBe('playing');
    expect(round.moves).toBe(0);
    expect(round.evaluated).toBe(false);
    expect(round.position).toEqual(round.maze.start);
    expect(VALID_DINOSAURS).toContain(round.dinosaur);
    expect(getGoalFood(round.dinosaur)).toEqual({ diet: round.diet, food: round.food });
  });

  test('avoids repeating the previous round creature', () => {
    const round = startRound({
      roundIndex: 1,
      level: 1,
      seed: 'seed-1',
      previousDinosaurId: DINOSAURS.TREX,
      dinosaurPool: [DINOSAURS.TREX, DINOSAURS.TRICERATOPS],
      randomFn: () => 0,
    });

    expect(round.dinosaur).toBe(DINOSAURS.TRICERATOPS);
  });

  test('on generation/solvability failure, logs code+mode and returns an error result (no round)', () => {
    jest.resetModules();
    jest.doMock('./mazeGenerator', () => ({
      generateMaze: () => ({ error: 'maze_generation_failed', level: 1, seed: 'broken:0' }),
    }));

    const logService = buildMemoryLogService();
    const { startRound: startRoundWithMockedGenerator } = require('./mazeGame');

    const result = startRoundWithMockedGenerator({ roundIndex: 0, level: 1, seed: 'broken', logService });

    expect(result).toEqual({ error: 'maze_generation_failed', level: 1, seed: 'broken:0', roundIndex: 0 });
    expect(logService.events).toEqual([
      {
        eventType: 'maze_round_generation_failed',
        metadata: { code: 'maze_generation_failed', mode: MODE_ID, level: 1, seed: 'broken:0', roundIndex: 0 },
      },
    ]);

    jest.dontMock('./mazeGenerator');
    jest.resetModules();
  });
});

describe('applyMove', () => {
  test('rejects an unknown direction', () => {
    expect(() => applyMove(buildFixedRound(), 'diagonal')).toThrow();
  });

  test('blocks a move into a wall without displacing the creature', () => {
    const round = buildFixedRound();
    const moved = applyMove(round, 'down');

    expect(moved.blocked).toBe(true);
    expect(moved.position).toEqual({ row: 0, col: 0 });
    expect(moved.moves).toBe(0);
    expect(moved.status).toBe('playing');
  });

  test('advances the creature through an open passage', () => {
    const round = buildFixedRound();
    const moved = applyMove(round, 'right');

    expect(moved.blocked).toBe(false);
    expect(moved.position).toEqual({ row: 0, col: 1 });
    expect(moved.moves).toBe(1);
    expect(moved.status).toBe('playing');
  });

  test('reaching the goal cell flips status to reached_goal without scoring', () => {
    const atGoalEntry = buildFixedRound({ position: { row: 0, col: 1 }, moves: 1 });
    const moved = applyMove(atGoalEntry, 'down');

    expect(moved.position).toEqual({ row: 1, col: 1 });
    expect(moved.status).toBe('reached_goal');
    expect(moved.evaluated).toBe(false);
  });

  test('ignores further moves once the round already reached its goal', () => {
    const finished = buildFixedRound({ position: { row: 1, col: 1 }, status: 'reached_goal', moves: 2 });
    const moved = applyMove(finished, 'up');

    expect(moved).toBe(finished);
  });
});

describe('evaluateRound', () => {
  test('throws when the round has not reached its goal yet', () => {
    expect(() => evaluateRound(buildFixedRound(), { score: 0, questionIndex: 0, answers: [] })).toThrow();
  });

  test('scores the round once and appends its answer entry', () => {
    const round = buildFixedRound({ position: { row: 1, col: 1 }, status: 'reached_goal', moves: 3 });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = evaluateRound(round, gameState);

    expect(result.round.status).toBe('completed');
    expect(result.round.evaluated).toBe(true);
    expect(result.gameState.score).toBe(1);
    expect(result.gameState.questionIndex).toBe(1);
    expect(result.gameState.answers).toEqual([
      { roundIndex: 0, dinosaur: DINOSAURS.TREX, diet: DIETS.CARNIVORO, food: FOODS.MEAT, moves: 3, isCorrect: true },
    ]);
  });

  test('a second evaluation of the same round is a no-op (never double-scores)', () => {
    const round = buildFixedRound({ position: { row: 1, col: 1 }, status: 'reached_goal', moves: 3 });
    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const first = evaluateRound(round, gameState);

    const second = evaluateRound(first.round, first.gameState);

    expect(second.gameState.score).toBe(1);
    expect(second.gameState.answers).toHaveLength(1);
  });
});

describe('startGame', () => {
  test('rejects an invalid level', () => {
    expect(() => startGame({ level: 0, seed: 's' })).toThrow();
    expect(() => startGame({ level: 11, seed: 's' })).toThrow();
  });

  test('returns a fresh state and the first of ROUNDS_PER_GAME rounds', () => {
    const game = startGame({ level: 1, seed: 'seed-1', randomFn: () => 0 });

    expect(game.state).toEqual({ score: 0, questionIndex: 0, answers: [] });
    expect(game.round.roundIndex).toBe(0);
    expect(game.round.error).toBeUndefined();
  });
});

describe('completeRound', () => {
  test('ends the game once ROUNDS_PER_GAME rounds are scored', () => {
    const round = buildFixedRound({ roundIndex: ROUNDS_PER_GAME - 1, position: { row: 1, col: 1 }, status: 'reached_goal', moves: 1 });
    const gameState = { score: ROUNDS_PER_GAME - 1, questionIndex: ROUNDS_PER_GAME - 1, answers: [] };

    const result = completeRound({ round, gameState, level: 1, seed: 'seed-1' });

    expect(result.gameOver).toBe(true);
    expect(result.state.score).toBe(ROUNDS_PER_GAME);
    expect(result.nextRound).toBeUndefined();
  });

  test('otherwise scores the round and starts the next one, avoiding an immediate creature repeat', () => {
    const round = buildFixedRound({ position: { row: 1, col: 1 }, status: 'reached_goal', moves: 1 });
    const gameState = { score: 0, questionIndex: 0, answers: [] };

    const result = completeRound({
      round,
      gameState,
      level: 1,
      seed: 'seed-1',
      dinosaurPool: [DINOSAURS.TREX, DINOSAURS.TRICERATOPS],
      randomFn: () => 0,
    });

    expect(result.gameOver).toBe(false);
    expect(result.nextRound.roundIndex).toBe(1);
    expect(result.nextRound.dinosaur).not.toBe(round.dinosaur);
  });
});

describe('a full 10-round game, played end to end through generateMaze', () => {
  function findPathDirections(maze) {
    const deltas = {
      up: { wall: 'N', row: -1, col: 0 },
      down: { wall: 'S', row: 1, col: 0 },
      left: { wall: 'W', row: 0, col: -1 },
      right: { wall: 'E', row: 0, col: 1 },
    };
    const visited = maze.grid.map((row) => row.map(() => false));
    const queue = [{ row: maze.start.row, col: maze.start.col, path: [] }];
    visited[maze.start.row][maze.start.col] = true;

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.row === maze.goal.row && current.col === maze.goal.col) {
        return current.path;
      }

      MOVE_DIRECTIONS.forEach((direction) => {
        const delta = deltas[direction];
        const nextRow = current.row + delta.row;
        const nextCol = current.col + delta.col;
        const inBounds = nextRow >= 0 && nextRow < maze.grid.length && nextCol >= 0 && nextCol < maze.grid[0].length;
        const open = inBounds && !maze.grid[current.row][current.col].walls[delta.wall];
        if (open && !visited[nextRow][nextCol]) {
          visited[nextRow][nextCol] = true;
          queue.push({ row: nextRow, col: nextCol, path: current.path.concat([direction]) });
        }
      });
    }

    throw new Error('maze has no path from start to goal');
  }

  function playRoundToGoal(round) {
    return findPathDirections(round.maze).reduce((current, direction) => applyMove(current, direction), round);
  }

  test('plays 10 rounds, ending game over with a full score and no back-to-back repeats', () => {
    const seenDinosaurs = [];
    let game = startGame({ level: 1, seed: 'integration-seed', randomFn: () => 0.5 });
    let { state } = game;
    let round = game.round;
    let result;

    for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
      expect(round.error).toBeUndefined();
      seenDinosaurs.push(round.dinosaur);

      const finished = playRoundToGoal(round);
      expect(finished.status).toBe('reached_goal');

      result = completeRound({ round: finished, gameState: state, level: 1, seed: 'integration-seed', randomFn: () => 0.5 });
      state = result.state;
      round = result.nextRound;
    }

    expect(result.gameOver).toBe(true);
    expect(state.score).toBe(ROUNDS_PER_GAME);
    expect(state.answers).toHaveLength(ROUNDS_PER_GAME);
    for (let i = 1; i < seenDinosaurs.length; i += 1) {
      expect(seenDinosaurs[i]).not.toBe(seenDinosaurs[i - 1]);
    }
  });
});
