'use strict';

const {
  MIN_LEVEL,
  MAX_LEVEL,
  MIN_DIMENSION,
  MAX_DIMENSION,
  MIN_LOOP_COUNT,
  MAX_LOOP_COUNT,
  isValidLevel,
  dimensionForLevel,
  loopCountForLevel,
  generateMaze,
  isMazeSolvable,
  validateMazeSolvable,
} = require('./mazeGenerator');

function buildMemoryLogService() {
  const events = [];
  return {
    events,
    logEvent(eventType, metadata) {
      events.push({ eventType, metadata });
    },
  };
}

describe('isValidLevel', () => {
  test('accepts integers between MIN_LEVEL and MAX_LEVEL', () => {
    expect(isValidLevel(MIN_LEVEL)).toBe(true);
    expect(isValidLevel(MAX_LEVEL)).toBe(true);
    expect(isValidLevel(5)).toBe(true);
  });

  test('rejects out-of-range, non-integer or non-numeric values', () => {
    expect(isValidLevel(MIN_LEVEL - 1)).toBe(false);
    expect(isValidLevel(MAX_LEVEL + 1)).toBe(false);
    expect(isValidLevel(1.5)).toBe(false);
    expect(isValidLevel('1')).toBe(false);
    expect(isValidLevel(undefined)).toBe(false);
  });
});

describe('dimensionForLevel / loopCountForLevel', () => {
  test('scale from their minimum at MIN_LEVEL to their maximum at MAX_LEVEL', () => {
    expect(dimensionForLevel(MIN_LEVEL)).toBe(MIN_DIMENSION);
    expect(dimensionForLevel(MAX_LEVEL)).toBe(MAX_DIMENSION);
    expect(loopCountForLevel(MIN_LEVEL)).toBe(MIN_LOOP_COUNT);
    expect(loopCountForLevel(MAX_LEVEL)).toBe(MAX_LOOP_COUNT);
  });

  test('never decrease as level increases (monotonic difficulty ramp)', () => {
    for (let level = MIN_LEVEL; level < MAX_LEVEL; level += 1) {
      expect(dimensionForLevel(level + 1)).toBeGreaterThanOrEqual(dimensionForLevel(level));
      expect(loopCountForLevel(level + 1)).toBeGreaterThanOrEqual(loopCountForLevel(level));
    }
  });

  test('stay within the 375px-friendly bounds at every level', () => {
    for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
      expect(dimensionForLevel(level)).toBeGreaterThanOrEqual(MIN_DIMENSION);
      expect(dimensionForLevel(level)).toBeLessThanOrEqual(MAX_DIMENSION);
    }
  });
});

describe('generateMaze', () => {
  test('throws for a level outside MIN_LEVEL-MAX_LEVEL', () => {
    expect(() => generateMaze({ seed: 'abc', level: MIN_LEVEL - 1 })).toThrow();
    expect(() => generateMaze({ seed: 'abc', level: MAX_LEVEL + 1 })).toThrow();
  });

  test('returns a maze with a start, a goal and a grid sized for the level', () => {
    const maze = generateMaze({ seed: 'seed-1', level: 4 });

    expect(maze.error).toBeUndefined();
    expect(maze.level).toBe(4);
    expect(maze.width).toBe(dimensionForLevel(4));
    expect(maze.height).toBe(dimensionForLevel(4));
    expect(maze.start).toEqual({ row: 0, col: 0 });
    expect(maze.goal).toEqual({ row: maze.height - 1, col: maze.width - 1 });
    expect(maze.grid).toHaveLength(maze.height);
    expect(maze.grid[0]).toHaveLength(maze.width);
  });

  test('is solvable (start reaches goal) at every level, across several seeds', () => {
    const seeds = ['alpha', 'beta', 'gamma-42', 12345, 'niños-6-8'];

    for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
      seeds.forEach((seed) => {
        const maze = generateMaze({ seed, level });
        expect(maze.error).toBeUndefined();
        expect(isMazeSolvable(maze)).toBe(true);
      });
    }
  });

  test('is deterministic: the same seed and level always produce the same maze', () => {
    const first = generateMaze({ seed: 'reproducible', level: 6 });
    const second = generateMaze({ seed: 'reproducible', level: 6 });

    expect(second.grid).toEqual(first.grid);
    expect(second.start).toEqual(first.start);
    expect(second.goal).toEqual(first.goal);
  });

  test('different seeds produce different mazes at the same level', () => {
    const first = generateMaze({ seed: 'seed-a', level: 8 });
    const second = generateMaze({ seed: 'seed-b', level: 8 });

    expect(second.grid).not.toEqual(first.grid);
  });

  test('a numeric seed works the same way as a string seed', () => {
    const maze = generateMaze({ seed: 987654, level: 3 });
    expect(isMazeSolvable(maze)).toBe(true);
  });
});

describe('isMazeSolvable / validateMazeSolvable', () => {
  function buildDisconnectedMaze() {
    // Two isolated 1x1 rooms: start and goal each fully walled in, so no
    // search can cross between them.
    const start = { row: 0, col: 0 };
    const goal = { row: 0, col: 1 };
    const grid = [
      [
        { row: 0, col: 0, walls: { N: true, S: true, E: true, W: true } },
        { row: 0, col: 1, walls: { N: true, S: true, E: true, W: true } },
      ],
    ];
    return { level: 1, seed: 'broken', grid, start, goal };
  }

  test('isMazeSolvable returns false when start and goal are not connected', () => {
    expect(isMazeSolvable(buildDisconnectedMaze())).toBe(false);
  });

  test('isMazeSolvable returns false for a missing/malformed maze', () => {
    expect(isMazeSolvable(null)).toBe(false);
    expect(isMazeSolvable({})).toBe(false);
    expect(isMazeSolvable({ grid: [], start: { row: 0, col: 0 }, goal: { row: 0, col: 0 } })).toBe(false);
  });

  test('validateMazeSolvable returns true and logs nothing for a solvable maze', () => {
    const logService = buildMemoryLogService();
    const maze = generateMaze({ seed: 'ok', level: 2 });

    expect(validateMazeSolvable(maze, { logService })).toBe(true);
    expect(logService.events).toEqual([]);
  });

  test('validateMazeSolvable returns false and logs maze_generation_failed for an unsolvable maze', () => {
    const logService = buildMemoryLogService();
    const maze = buildDisconnectedMaze();

    expect(validateMazeSolvable(maze, { logService })).toBe(false);
    expect(logService.events).toEqual([
      { eventType: 'maze_generation_failed', metadata: { level: 1, seed: 'broken' } },
    ]);
  });
});
