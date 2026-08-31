'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-259: covers the Laberinto integration end to end -- reaching the
 * mode via the app shell's #/laberinto route, playing a full 10-round game
 * with the device reporting no network connectivity at all (mirrors
 * tests/pwa/offline-full-game.test.js's own TRIOFSND-111 coverage for Quiz),
 * the aggregated local-only diagnostics counters (logging.js), and the
 * `dinoquiz:lastMode`/abandon-tracking state main.js now drives.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const MAZE_GAME_PATH = path.resolve(__dirname, '../../public/scripts/mazeGame.js');
const i18n = require('../../public/i18n/es.json');
const { results: resultsStrings } = i18n;

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

/** BFS over `maze` from start to goal, same helper shape as tests/pwa/maze-game-browser.test.js. */
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

/**
 * Precomputes every round's path via the same seed/level/randomFn the live
 * game (started through main.js) will use -- maze generation is
 * deterministic, so this independently-run copy produces the identical
 * sequence of mazes/dinosaurs, and the directions below apply 1:1 to the
 * buttons rendered by the real app-shell flow.
 */
function precomputeRoundPaths(seed, level, randomFn) {
  const mazeGame = require(MAZE_GAME_PATH);
  const paths = [];
  let game = mazeGame.startGame({ seed, level, randomFn });
  let state = game.state;
  let round = game.round;

  for (let i = 0; i < mazeGame.ROUNDS_PER_GAME; i += 1) {
    paths.push(findPathDirections(round.maze));
    const finished = findPathDirections(round.maze).reduce((current, direction) => mazeGame.applyMove(current, direction), round);
    const result = mazeGame.completeRound({ round: finished, gameState: state, level, seed, randomFn });
    state = result.state;
    round = result.nextRound;
  }

  return paths;
}

function clickDirection(container, direction) {
  const button = container.querySelector('.maze-screen__control-button--' + direction);
  button.click();
}

describe('TRIOFSND-259: Laberinto reachable via #/laberinto, plays a full offline game', () => {
  let container;
  let hadOwnFetch;
  let originalFetch;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    hadOwnFetch = Object.prototype.hasOwnProperty.call(global, 'fetch');
    originalFetch = global.fetch;
    window.localStorage.clear();
    goOffline();
  });

  afterEach(() => {
    container.remove();
    if (hadOwnFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  });

  test('a whole Laberinto game plays through offline via renderRoute(#/laberinto), ending on Resultados', () => {
    global.fetch = rejectingFetch();

    const { renderRoute, resolveLogger } = require(MAIN_JS_PATH);
    const seed = 'offline-maze-seed';
    const level = 1;
    const randomFn = () => 0.5;
    const paths = precomputeRoundPaths(seed, level, randomFn);

    // Force the same deterministic seed/randomFn the live game will consume
    // by driving it directly through startMazeGame instead of the hash
    // route's own (real-clock) defaults -- renderRoute exercises the same
    // renderMazeRoute -> startMazeGame path, just without a fixed seed.
    const { startMazeGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const logger = resolveLogger();

    startMazeGame(container, renderers, document, undefined, { level, seed, randomFn, logger });

    expect(container.querySelector('.maze-screen')).not.toBeNull();

    paths.forEach((directions) => {
      directions.forEach((direction) => clickDirection(container, direction));
      const nextButton = container.querySelector('.maze-screen__next-button');
      expect(nextButton.hidden).toBe(false);
      nextButton.click();
    });

    expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
    expect(container.textContent).toContain('10/10');
    expect(container.querySelector('.results-screen__stars')).toHaveAttribute(
      'aria-label',
      resultsStrings.starsLabel.replace('{stars}', '3').replace('{maxStars}', '3')
    );

    // Diagnostics counters (TRIOFSND-259 logging.js): one game started and
    // completed at level 1, no resolvability failures, never abandoned.
    expect(logger.getMazeGamesStartedByLevel()).toEqual({ 1: 1 });
    expect(logger.getMazeGamesCompletedByLevel()).toEqual({ 1: 1 });
    expect(logger.getMazeGamesAbandonedByLevel()).toEqual({});
    expect(logger.getMazeResolvabilityFailureCount()).toBe(0);

    // Last-mode restoration (TRIOFSND-230/259): remembered under dinoquiz:lastMode.
    expect(window.localStorage.getItem('dinoquiz:lastMode')).toBe('"laberinto"');

    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('"Volver a jugar" starts a fresh Laberinto game after Resultados', () => {
    global.fetch = rejectingFetch();

    const { startMazeGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const seed = 'offline-maze-seed-2';
    const level = 1;
    const randomFn = () => 0.5;
    const paths = precomputeRoundPaths(seed, level, randomFn);

    startMazeGame(container, renderers, document, undefined, { level, seed, randomFn });

    paths.forEach((directions) => {
      directions.forEach((direction) => clickDirection(container, direction));
      container.querySelector('.maze-screen__next-button').click();
    });

    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();

    expect(container.querySelector('.maze-screen')).not.toBeNull();
    expect(container.querySelector('.results-screen')).toBeNull();
  });
});

describe('TRIOFSND-259: leaving an in-progress Laberinto game logs it as abandoned', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    window.localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    container.remove();
    window.location.hash = '';
  });

  test('navigating away mid-game tallies mazeGamesAbandonedByLevel exactly once, never completed', () => {
    const { startMazeGame, resolveScreenRenderers, resolveLogger, renderRoute } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const logger = resolveLogger();

    startMazeGame(container, renderers, document, undefined, { level: 1, seed: 'abandon-seed', randomFn: () => 0.5, logger });
    expect(container.querySelector('.maze-screen')).not.toBeNull();

    // Simulate the player leaving Laberinto for Inicio before finishing --
    // renderRoute is what main.js's own hashchange listener calls. It
    // resolves its own logger internally, so read the tally back through a
    // fresh instance sharing the same (real) localStorage backend, the same
    // "round-trip through storage" pattern LogService.test.js already uses.
    renderRoute(document, undefined, { hash: '' });

    const reloadedLogger = resolveLogger();
    expect(reloadedLogger.getMazeGamesAbandonedByLevel()).toEqual({ 1: 1 });
    expect(reloadedLogger.getMazeGamesCompletedByLevel()).toEqual({});

    // Leaving again (already cleared) must not double-count.
    renderRoute(document, undefined, { hash: '' });
    expect(resolveLogger().getMazeGamesAbandonedByLevel()).toEqual({ 1: 1 });
  });

  test('TRIOFSND-318: start and mid-game abandon also tally gameStarted/gameAbandoned:laberinto diagnostics counters', () => {
    const { startMazeGame, resolveScreenRenderers, resolveDiagnostics, renderRoute } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const diagnostics = resolveDiagnostics();

    startMazeGame(container, renderers, document, undefined, {
      level: 1,
      seed: 'diagnostics-seed',
      randomFn: () => 0.5,
      diagnostics,
    });
    expect(diagnostics.getCounters()['gameStarted:laberinto']).toBe(1);

    renderRoute(document, undefined, { hash: '' });

    expect(resolveDiagnostics().getCounters()['gameAbandoned:laberinto']).toBe(1);
  });
});
