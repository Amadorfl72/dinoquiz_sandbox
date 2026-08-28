'use strict';

const path = require('path');

const MAZE_GAME_PATH = path.resolve(__dirname, '../../public/scripts/mazeGame.js');

const {
  ROUNDS_PER_GAME,
  MODE_ID,
  FOODS,
  DEFAULT_DINOSAUR_POOL,
  getGoalFood,
  pickDinosaur,
  startRound,
  applyMove,
  evaluateRound,
  startGame,
  completeRound,
} = require(MAZE_GAME_PATH);
const { CREATURE_SHEETS, DIETS } = require('../../src/data/creatureSheet');
const { VALID_DINOSAURS } = require('../../src/data/questionBank');
const { MODE_IDS } = require('../../src/game/modesCatalog');

/**
 * TRIOFSND-259: public/scripts/mazeGame.js is the browser-runnable twin of
 * src/game/mazeGame.js (see that file's own doc comment for why it can't
 * just re-export it — the real module's dependency chain requires `fs`,
 * which doesn't exist in a real, unbundled browser). Its local
 * `DINOSAUR_DIETS`/`DEFAULT_DINOSAUR_POOL` mirror
 * src/data/creatureSheet.js/questionBank.js by hand, so this guards against
 * the two silently drifting apart, and exercises the same round/game state
 * machine main.js drives at runtime.
 */
describe('public/scripts/mazeGame.js mirrors the authoritative creature data', () => {
  test('DEFAULT_DINOSAUR_POOL matches the shipped dinosaur roster', () => {
    expect(DEFAULT_DINOSAUR_POOL.slice().sort()).toEqual(VALID_DINOSAURS.slice().sort());
  });

  test('getGoalFood resolves the exact same diet/food as src/data/creatureSheet.js for every shipped dinosaur', () => {
    const FOOD_BY_DIET = {
      [DIETS.CARNIVORO]: FOODS.MEAT,
      [DIETS.HERBIVORO]: FOODS.LEAVES,
      [DIETS.OMNIVORO]: FOODS.MIXED,
    };
    VALID_DINOSAURS.forEach((dinosaur) => {
      const sheet = CREATURE_SHEETS[dinosaur];
      expect(getGoalFood(dinosaur)).toEqual({
        diet: sheet.diet,
        food: FOOD_BY_DIET[sheet.diet],
      });
    });
  });

  test('MODE_ID matches src/game/modesCatalog.js MODE_IDS.LABERINTO', () => {
    expect(MODE_ID).toBe(MODE_IDS.LABERINTO);
  });
});

describe('getGoalFood', () => {
  test('resolves carne/hojas exclusively from the local diet map', () => {
    expect(getGoalFood('trex')).toEqual({ diet: 'carnivoro', food: FOODS.MEAT });
    expect(getGoalFood('triceratops')).toEqual({ diet: 'herbivoro', food: FOODS.LEAVES });
  });

  test('resolves the mixed prize for an omnivore, via an injected creature sheet', () => {
    const getCreatureSheet = (id) => (id === 'gallimimus' ? { id, diet: 'omnivoro' } : undefined);
    expect(getGoalFood('gallimimus', { getCreatureSheet })).toEqual({ diet: 'omnivoro', food: FOODS.MIXED });
  });

  test('throws instead of guessing a diet for a creature with no verified card', () => {
    expect(() => getGoalFood('unknown-creature')).toThrow();
  });
});

describe('pickDinosaur', () => {
  test('never repeats the previous round creature when the pool has another option', () => {
    const pool = ['trex', 'triceratops'];
    for (let i = 0; i < 20; i += 1) {
      const picked = pickDinosaur('trex', { dinosaurPool: pool, randomFn: () => i / 20 });
      expect(picked).toBe('triceratops');
    }
  });

  test('defaults to the shipped dinosaur roster', () => {
    const picked = pickDinosaur(null, { randomFn: () => 0 });
    expect(DEFAULT_DINOSAUR_POOL).toContain(picked);
  });
});

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
    Object.keys(deltas).forEach((direction) => {
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

describe('startRound / applyMove / evaluateRound', () => {
  test('startRound rejects a roundIndex outside 0..ROUNDS_PER_GAME-1', () => {
    expect(() => startRound({ roundIndex: -1, level: 1, seed: 's' })).toThrow();
    expect(() => startRound({ roundIndex: ROUNDS_PER_GAME, level: 1, seed: 's' })).toThrow();
  });

  test('startRound returns a round positioned at the maze start with goal food attached', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 'seed-1', randomFn: () => 0 });

    expect(round.error).toBeUndefined();
    expect(round.status).toBe('playing');
    expect(round.position).toEqual(round.maze.start);
    expect(DEFAULT_DINOSAUR_POOL).toContain(round.dinosaur);
  });

  test('a full round can be walked to its goal and evaluated exactly once', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 'seed-1', randomFn: () => 0 });
    const finished = playRoundToGoal(round);

    expect(finished.status).toBe('reached_goal');

    const gameState = { score: 0, questionIndex: 0, answers: [] };
    const result = evaluateRound(finished, gameState);

    expect(result.gameState.score).toBe(1);
    expect(result.round.evaluated).toBe(true);

    // A second evaluation never double-scores.
    const second = evaluateRound(result.round, result.gameState);
    expect(second.gameState.score).toBe(1);
  });
});

describe('startGame / completeRound: a full 10-round game', () => {
  test('rejects an invalid level', () => {
    expect(() => startGame({ level: 0, seed: 's' })).toThrow();
  });

  test('plays 10 rounds end to end, ending game over with a full score and no back-to-back repeats', () => {
    const seenDinosaurs = [];
    let game = startGame({ level: 1, seed: 'integration-seed', randomFn: () => 0.5 });
    let { state } = game;
    let round = game.round;
    let result;

    for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
      expect(round.error).toBeUndefined();
      seenDinosaurs.push(round.dinosaur);

      const finished = playRoundToGoal(round);
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
