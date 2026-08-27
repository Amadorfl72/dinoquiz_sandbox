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
 *
 * Browser bridge (TRIOFSND-259): DinoQuiz has no bundler, so the Laberinto
 * round orchestration the app shell drives at runtime (public/scripts/
 * mazeGame.js) cannot `require` this from `src/` in a real browser. This
 * module lives under `public/` and follows the same dual CommonJS/global
 * pattern as public/scripts/gameFlow.js — it registers on
 * `window.DinoQuiz.game.mazeGenerator` (nested, so it never clobbers
 * gameFlow.js's own flat `window.DinoQuiz.game` properties) for the
 * `<script>`-loaded PWA and also `module.exports` for Node/Jest. The
 * canonical `src/game/mazeGenerator.js` re-exports this file.
 */

(function () {
  var MIN_LEVEL = 1;
  var MAX_LEVEL = 10;

  // Smallest maze (level 1) is easy to scan at a glance; the largest (level
  // MAX_LEVEL) still leaves comfortably touch-sized cells on a 375px-wide
  // screen (375 / 9 ≈ 41px per cell before the screen's own padding/margins).
  var MIN_DIMENSION = 5;
  var MAX_DIMENSION = 9;

  // Extra passages opened beyond the single spanning-tree path, scaled by
  // level so higher levels add alternate routes/dead ends without growing the
  // grid past MAX_DIMENSION.
  var MIN_LOOP_COUNT = 0;
  var MAX_LOOP_COUNT = 6;

  var DIRECTIONS = [
    { wall: 'N', opposite: 'S', deltaRow: -1, deltaCol: 0 },
    { wall: 'S', opposite: 'N', deltaRow: 1, deltaCol: 0 },
    { wall: 'E', opposite: 'W', deltaRow: 0, deltaCol: 1 },
    { wall: 'W', opposite: 'E', deltaRow: 0, deltaCol: -1 },
  ];

  var MAX_GENERATION_ATTEMPTS = 5;

  function isValidLevel(level) {
    return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
  }

  /** Linear interpolation of `value` from [MIN_LEVEL, MAX_LEVEL] to [min, max], rounded down. */
  function scaleByLevel(level, min, max) {
    if (MAX_LEVEL === MIN_LEVEL) {
      return min;
    }
    var ratio = (level - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL);
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

    var text = String(seed);
    var hash = 0x811c9dc5;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /** mulberry32: a small, fast, deterministic PRNG returning floats in [0, 1). */
  function createRandom(seed) {
    var state = hashSeed(seed);
    return function random() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createGrid(width, height) {
    var grid = [];
    for (var row = 0; row < height; row += 1) {
      var cells = [];
      for (var col = 0; col < width; col += 1) {
        cells.push({ row: row, col: col, walls: { N: true, S: true, E: true, W: true } });
      }
      grid.push(cells);
    }
    return grid;
  }

  function inBounds(grid, row, col) {
    return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
  }

  function removeWallBetween(grid, cell, direction) {
    var neighbor = grid[cell.row + direction.deltaRow][cell.col + direction.deltaCol];
    cell.walls[direction.wall] = false;
    neighbor.walls[direction.opposite] = false;
  }

  function hasWallBetween(grid, cell, direction) {
    return cell.walls[direction.wall];
  }

  /** Shuffles a shallow copy of `items` in place using `random`; does not mutate `items`. */
  function shuffled(items, random) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(random() * (i + 1));
      var temp = copy[i];
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
    var visited = grid.map(function (row) {
      return row.map(function () {
        return false;
      });
    });
    var stack = [origin];
    visited[origin.row][origin.col] = true;

    while (stack.length > 0) {
      var current = stack[stack.length - 1];
      var unvisitedDirections = shuffled(DIRECTIONS, random).filter(function (direction) {
        var nextRow = current.row + direction.deltaRow;
        var nextCol = current.col + direction.deltaCol;
        return inBounds(grid, nextRow, nextCol) && !visited[nextRow][nextCol];
      });

      if (unvisitedDirections.length === 0) {
        stack.pop();
        continue;
      }

      var direction = unvisitedDirections[0];
      removeWallBetween(grid, current, direction);
      var next = grid[current.row + direction.deltaRow][current.col + direction.deltaCol];
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

    var candidates = [];
    grid.forEach(function (row) {
      row.forEach(function (cell) {
        DIRECTIONS.forEach(function (direction) {
          var nextRow = cell.row + direction.deltaRow;
          var nextCol = cell.col + direction.deltaCol;
          if (inBounds(grid, nextRow, nextCol) && hasWallBetween(grid, cell, direction)) {
            candidates.push({ cell: cell, direction: direction });
          }
        });
      });
    });

    var picks = shuffled(candidates, random).slice(0, loopCount);
    picks.forEach(function (pick) {
      if (hasWallBetween(grid, pick.cell, pick.direction)) {
        removeWallBetween(grid, pick.cell, pick.direction);
      }
    });
  }

  /**
   * BFS over `maze.grid` from `maze.start` to `maze.goal`, respecting walls.
   * Reusable by both the generator (to guarantee what it returns) and tests /
   * failure logging, so every caller shares one definition of "solvable".
   */
  function isMazeSolvable(maze) {
    var grid = maze && maze.grid;
    var start = maze && maze.start;
    var goal = maze && maze.goal;
    if (!Array.isArray(grid) || grid.length === 0 || !start || !goal) {
      return false;
    }
    if (!inBounds(grid, start.row, start.col) || !inBounds(grid, goal.row, goal.col)) {
      return false;
    }

    var visited = grid.map(function (row) {
      return row.map(function () {
        return false;
      });
    });
    var queue = [start];
    visited[start.row][start.col] = true;

    while (queue.length > 0) {
      var current = queue.shift();
      if (current.row === goal.row && current.col === goal.col) {
        return true;
      }

      var cell = grid[current.row][current.col];
      DIRECTIONS.forEach(function (direction) {
        var nextRow = current.row + direction.deltaRow;
        var nextCol = current.col + direction.deltaCol;
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

  var noopLogService = { logEvent: function () {} };
  var defaultLogService;

  /** Lazily resolves a shared LogService (Node/Jest via `require`, browser via `window.DinoQuiz`), falling back to a no-op. */
  function resolveDefaultLogService() {
    if (defaultLogService) {
      return defaultLogService;
    }

    var loggingModule =
      typeof require === 'function'
        ? require('../../src/services/logging')
        : (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.logging);

    defaultLogService =
      loggingModule && typeof loggingModule.LogService === 'function' ? new loggingModule.LogService() : noopLogService;

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

    var logService = options.logService || resolveDefaultLogService();
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
    var seed = options.seed;
    var level = options.level;

    if (!isValidLevel(level)) {
      throw new Error('level must be an integer between ' + MIN_LEVEL + ' and ' + MAX_LEVEL);
    }

    var logService = options.logService || resolveDefaultLogService();
    var width = dimensionForLevel(level);
    var height = dimensionForLevel(level);
    var loopCount = loopCountForLevel(level);
    var start = { row: 0, col: 0 };
    var goal = { row: height - 1, col: width - 1 };

    var lastMaze;
    for (var attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      var random = createRandom(hashSeed(seed) + ':' + level + ':' + attempt);
      var grid = createGrid(width, height);
      carvePerfectMaze(grid, grid[start.row][start.col], random);
      addLoops(grid, loopCount, random);

      lastMaze = { seed: seed, level: level, width: width, height: height, grid: grid, start: start, goal: goal };
      if (isMazeSolvable(lastMaze)) {
        return lastMaze;
      }
    }

    validateMazeSolvable(lastMaze, { logService: logService });
    return { error: 'maze_generation_failed', level: level, seed: seed };
  }

  var api = {
    MIN_LEVEL: MIN_LEVEL,
    MAX_LEVEL: MAX_LEVEL,
    MIN_DIMENSION: MIN_DIMENSION,
    MAX_DIMENSION: MAX_DIMENSION,
    MIN_LOOP_COUNT: MIN_LOOP_COUNT,
    MAX_LOOP_COUNT: MAX_LOOP_COUNT,
    isValidLevel: isValidLevel,
    dimensionForLevel: dimensionForLevel,
    loopCountForLevel: loopCountForLevel,
    hashSeed: hashSeed,
    createRandom: createRandom,
    generateMaze: generateMaze,
    isMazeSolvable: isMazeSolvable,
    validateMazeSolvable: validateMazeSolvable,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.mazeGenerator = api;
  }
})();
