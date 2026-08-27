'use strict';

/**
 * Solvable maze generation for the Laberinto game mode (TRIOFSND-255).
 *
 * `generateMaze({ seed, level })` carves a maze on a WIDTH x HEIGHT grid with
 * a seeded PRNG (mulberry32) so the same `seed` + `level` pair always
 * reproduces the exact same maze — required for deterministic tests and for
 * replaying a level. The carve uses a randomized depth-first "recursive
 * backtracker": starting from `start`, it walks to a random unvisited
 * neighbour, knocking down the wall between them, backtracking when stuck.
 * That walk visits every cell exactly once and only ever removes walls, so
 * the result is a spanning tree over the grid — every cell (in particular
 * `goal`) is reachable from `start` by construction.
 *
 * `level` (MIN_LEVEL..MAX_LEVEL, mirrors src/data/questionBank.js's generic
 * ceiling) scales difficulty two ways, both capped well under what a 375px
 * screen can render as touch-sized cells (the screen does the final visual
 * fit — see the module's task description):
 *   - `dimensionForLevel`: the grid grows from MIN_DIMENSION at level 1 to
 *     MAX_DIMENSION at MAX_LEVEL.
 *   - `loopCountForLevel`: on top of the single spanning-tree path, a few
 *     extra walls are knocked down between already-reachable neighbours,
 *     opening short loops/alternate routes and dead ends. This never removes
 *     a cell's only connection (walls are only ever removed, never added),
 *     so it cannot disconnect `goal` from `start`.
 *
 * Per the task ("garantice mediante un algoritmo de búsqueda... que existe
 * al menos un camino válido"), `generateMaze` does not just trust that
 * construction: it runs `isMazeSolvable` (a BFS over the carved grid) before
 * returning, and only returns a maze that passes. Both `isMazeSolvable` (the
 * pure BFS check) and `validateMazeSolvable` (the same check plus the
 * `maze_generation_failed` logging `generateMaze` falls back to) are
 * exported so tests and failure logging reuse the exact same definition of
 * "solvable" instead of re-implementing pathfinding.
 */

const { LogService } = require('../services/logging');

const MIN_LEVEL = 1;
const MAX_LEVEL = 10;

// Smallest maze (level 1) is easy to scan at a glance; the largest (level
// MAX_LEVEL) still leaves comfortably touch-sized cells on a 375px-wide
// screen (375 / 9 ≈ 41px per cell before the screen's own padding/margins).
const MIN_DIMENSION = 5;
const MAX_DIMENSION = 9;

// Extra passages opened beyond the single spanning-tree path, scaled by
// level so higher levels add alternate routes/dead ends without growing the
// grid past MAX_DIMENSION.
const MIN_LOOP_COUNT = 0;
const MAX_LOOP_COUNT = 6;

const DIRECTIONS = [
  { wall: 'N', opposite: 'S', deltaRow: -1, deltaCol: 0 },
  { wall: 'S', opposite: 'N', deltaRow: 1, deltaCol: 0 },
  { wall: 'E', opposite: 'W', deltaRow: 0, deltaCol: 1 },
  { wall: 'W', opposite: 'E', deltaRow: 0, deltaCol: -1 },
];

const MAX_GENERATION_ATTEMPTS = 5;

function isValidLevel(level) {
  return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
}

/** Linear interpolation of `value` from [MIN_LEVEL, MAX_LEVEL] to [min, max], rounded down. */
function scaleByLevel(level, min, max) {
  if (MAX_LEVEL === MIN_LEVEL) {
    return min;
  }
  const ratio = (level - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL);
  return min + Math.floor(ratio * (max - min));
}

function dimensionForLevel(level) {
  return scaleByLevel(level, MIN_DIMENSION, MAX_DIMENSION);
}

function loopCountForLevel(level) {
  return scaleByLevel(level, MIN_LOOP_COUNT, MAX_LOOP_COUNT);
}

/**
 * Deterministic 32-bit hash (FNV-1a) so a string seed maps to a stable
 * numeric seed for `createRandom`. Numeric seeds are used as-is.
 */
function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }

  const text = String(seed);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a small, fast, deterministic PRNG returning floats in [0, 1). */
function createRandom(seed) {
  let state = hashSeed(seed);
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGrid(width, height) {
  const grid = [];
  for (let row = 0; row < height; row += 1) {
    const cells = [];
    for (let col = 0; col < width; col += 1) {
      cells.push({ row, col, walls: { N: true, S: true, E: true, W: true } });
    }
    grid.push(cells);
  }
  return grid;
}

function inBounds(grid, row, col) {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

function removeWallBetween(grid, cell, direction) {
  const neighbor = grid[cell.row + direction.deltaRow][cell.col + direction.deltaCol];
  cell.walls[direction.wall] = false;
  neighbor.walls[direction.opposite] = false;
}

function hasWallBetween(grid, cell, direction) {
  return cell.walls[direction.wall];
}

/** Shuffles a shallow copy of `items` in place using `random`; does not mutate `items`. */
function shuffled(items, random) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Randomized depth-first carve (recursive backtracker, iterative to avoid
 * call-stack limits on larger grids). Visits every cell exactly once, so the
 * resulting grid is a spanning tree: every cell is reachable from `origin`.
 */
function carvePerfectMaze(grid, origin, random) {
  const visited = grid.map((row) => row.map(() => false));
  const stack = [origin];
  visited[origin.row][origin.col] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisitedDirections = shuffled(DIRECTIONS, random).filter((direction) => {
      const nextRow = current.row + direction.deltaRow;
      const nextCol = current.col + direction.deltaCol;
      return inBounds(grid, nextRow, nextCol) && !visited[nextRow][nextCol];
    });

    if (unvisitedDirections.length === 0) {
      stack.pop();
      continue;
    }

    const direction = unvisitedDirections[0];
    removeWallBetween(grid, current, direction);
    const next = grid[current.row + direction.deltaRow][current.col + direction.deltaCol];
    visited[next.row][next.col] = true;
    stack.push(next);
  }
}

/**
 * Knocks down up to `loopCount` extra walls between random adjacent cells
 * that still have one, opening short alternate routes/dead ends on top of
 * the spanning tree. Only ever removes walls, so it cannot disconnect the
 * maze that `carvePerfectMaze` already fully connected.
 */
function addLoops(grid, loopCount, random) {
  if (loopCount <= 0) {
    return;
  }

  const candidates = [];
  grid.forEach((row) => {
    row.forEach((cell) => {
      DIRECTIONS.forEach((direction) => {
        const nextRow = cell.row + direction.deltaRow;
        const nextCol = cell.col + direction.deltaCol;
        if (inBounds(grid, nextRow, nextCol) && hasWallBetween(grid, cell, direction)) {
          candidates.push({ cell, direction });
        }
      });
    });
  });

  const picks = shuffled(candidates, random).slice(0, loopCount);
  picks.forEach(({ cell, direction }) => {
    if (hasWallBetween(grid, cell, direction)) {
      removeWallBetween(grid, cell, direction);
    }
  });
}

/**
 * BFS over `maze.grid` from `maze.start` to `maze.goal`, respecting walls.
 * Reusable by both the generator (to guarantee what it returns) and tests /
 * failure logging, so every caller shares one definition of "solvable".
 */
function isMazeSolvable(maze) {
  const { grid, start, goal } = maze || {};
  if (!Array.isArray(grid) || grid.length === 0 || !start || !goal) {
    return false;
  }
  if (!inBounds(grid, start.row, start.col) || !inBounds(grid, goal.row, goal.col)) {
    return false;
  }

  const visited = grid.map((row) => row.map(() => false));
  const queue = [start];
  visited[start.row][start.col] = true;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.row === goal.row && current.col === goal.col) {
      return true;
    }

    const cell = grid[current.row][current.col];
    DIRECTIONS.forEach((direction) => {
      const nextRow = current.row + direction.deltaRow;
      const nextCol = current.col + direction.deltaCol;
      if (
        inBounds(grid, nextRow, nextCol) &&
        !hasWallBetween(grid, cell, direction) &&
        !visited[nextRow][nextCol]
      ) {
        visited[nextRow][nextCol] = true;
        queue.push({ row: nextRow, col: nextCol });
      }
    });
  }

  return false;
}

let defaultLogService;

function resolveDefaultLogService() {
  if (!defaultLogService) {
    defaultLogService = new LogService();
  }
  return defaultLogService;
}

/**
 * Runs `isMazeSolvable(maze)` and, when it fails, logs a
 * `maze_generation_failed` event (level + seed, no personal data) via
 * `options.logService` (or the shared default) before returning `false`.
 * Shared by `generateMaze`'s own retry/failure path and by tests, so both
 * exercise the exact same solvability check and failure-reporting shape.
 */
function validateMazeSolvable(maze, options) {
  options = options || {};

  if (isMazeSolvable(maze)) {
    return true;
  }

  const logService = options.logService || resolveDefaultLogService();
  logService.logEvent('maze_generation_failed', {
    level: maze && maze.level,
    seed: maze && String(maze.seed),
  });
  return false;
}

/**
 * Generates a maze for `level` from `seed` (any string or number): the
 * dimensions and number of loop passages scale with level (see
 * `dimensionForLevel`/`loopCountForLevel`), entrance (`start`) is always the
 * top-left cell and exit (`goal`) the bottom-right cell, and the carved grid
 * is validated with `isMazeSolvable` (BFS) before being returned.
 *
 * Carving is deterministic and only ever removes walls, so it cannot
 * actually produce an unsolvable grid; the validation/retry loop exists as a
 * defensive guarantee per the task's requirement rather than a code path
 * expected to trigger. If every attempt still somehow fails, a
 * `maze_generation_failed` event is logged (mirrors gameFlow.js's
 * `startLevel` handling of `level_generation_failed`) and an error result is
 * returned instead of an unsolvable maze.
 */
function generateMaze(options) {
  options = options || {};
  const { seed, level } = options;

  if (!isValidLevel(level)) {
    throw new Error(`level must be an integer between ${MIN_LEVEL} and ${MAX_LEVEL}`);
  }

  const logService = options.logService || resolveDefaultLogService();
  const width = dimensionForLevel(level);
  const height = dimensionForLevel(level);
  const loopCount = loopCountForLevel(level);
  const start = { row: 0, col: 0 };
  const goal = { row: height - 1, col: width - 1 };

  let lastMaze;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const random = createRandom(`${hashSeed(seed)}:${level}:${attempt}`);
    const grid = createGrid(width, height);
    carvePerfectMaze(grid, grid[start.row][start.col], random);
    addLoops(grid, loopCount, random);

    lastMaze = { seed, level, width, height, grid, start, goal };
    if (isMazeSolvable(lastMaze)) {
      return lastMaze;
    }
  }

  validateMazeSolvable(lastMaze, { logService });
  return { error: 'maze_generation_failed', level, seed };
}

module.exports = {
  MIN_LEVEL,
  MAX_LEVEL,
  MIN_DIMENSION,
  MAX_DIMENSION,
  MIN_LOOP_COUNT,
  MAX_LOOP_COUNT,
  isValidLevel,
  dimensionForLevel,
  loopCountForLevel,
  hashSeed,
  createRandom,
  generateMaze,
  isMazeSolvable,
  validateMazeSolvable,
};
