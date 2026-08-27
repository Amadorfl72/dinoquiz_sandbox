'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getAllByRole, fireEvent } = require('@testing-library/dom');

const { renderMazeScreen } = require('./MazeScreen');
const { maze: strings } = require('../../public/i18n/es.json');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

/**
 * A tiny, hand-built 2x2 maze (not `mazeGenerator.generateMaze`'s output)
 * so every wall is known and deterministic: (0,0) -> (0,1) [east open] ->
 * (1,1) [south open] is the only path, everything else stays walled. This
 * lets tests assert exact button availability/blocked behavior without
 * depending on a seed producing a particular layout.
 */
function buildRound(overrides = {}) {
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

  return {
    level: 3,
    dinosaur: 'trex',
    diet: 'carnivoro',
    food: 'carne',
    maze: {
      width: 2,
      height: 2,
      start: { row: 0, col: 0 },
      goal: { row: 1, col: 1 },
      grid,
    },
    position: { row: 0, col: 0 },
    moves: 0,
    status: 'playing',
    blocked: false,
    evaluated: false,
    ...overrides,
  };
}

describe('MazeScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the title, instructions, round progress and level from the real es.json strings', () => {
    const round = buildRound();
    renderMazeScreen(container, round, { roundNumber: 2, totalRounds: 10 });

    expect(container.textContent).toContain(strings.screenTitle);
    expect(container.textContent).toContain(strings.instructions);
    expect(container.textContent).toContain('Ronda 2 de 10');
    expect(container.textContent).toContain('Nivel 3');
  });

  test('renders the board as a single labeled, aria-hidden-content image with one cell per grid position', () => {
    const round = buildRound();
    const { board } = renderMazeScreen(container, round);

    expect(board).toHaveAttribute('role', 'img');
    expect(board).toHaveAttribute('aria-label', strings.boardLabel);
    expect(board.querySelectorAll('.maze-screen__cell')).toHaveLength(4);
  });

  test('renders exactly four accessible directional control buttons', () => {
    const round = buildRound();
    renderMazeScreen(container, round);

    const buttons = getAllByRole(container, 'button').filter((button) =>
      button.className.indexOf('maze-screen__control-button') === 0
    );
    expect(buttons).toHaveLength(4);
  });

  test('disables and labels directions blocked by a wall, from the very first render (TRIOFSND-258, "estados de disponibilidad")', () => {
    const round = buildRound();
    const { controlButtons } = renderMazeScreen(container, round);

    // Only "right" (east) is open from (0,0) in the hand-built maze above.
    expect(controlButtons.up.disabled).toBe(true);
    expect(controlButtons.down.disabled).toBe(true);
    expect(controlButtons.left.disabled).toBe(true);
    expect(controlButtons.right.disabled).toBe(false);

    expect(controlButtons.up.getAttribute('aria-label')).toBe(
      strings.controls.unavailableAriaLabelFormat.replace('{direction}', strings.controls.up)
    );
    expect(controlButtons.right.getAttribute('aria-label')).toBe(strings.controls.rightAriaLabel);
  });

  test('shows the visible "no disponible" caption under a blocked control, not just a disabled/color state', () => {
    const round = buildRound();
    const { controlButtons } = renderMazeScreen(container, round);

    const caption = controlButtons.up.closest('.maze-screen__control').querySelector('.maze-screen__control-state');
    expect(caption.hidden).toBe(false);
    expect(caption.textContent).toBe(strings.controls.unavailableState);
  });

  test('an arrow-key press into a wall announces the blocked message and never moves the position (touch and keyboard share one blocked path)', () => {
    const round = buildRound();
    const { root, announcementEl, blockedMessage, getPosition, getMoves } = renderMazeScreen(container, round);

    fireEvent.keyDown(root, { key: 'ArrowUp' });

    expect(blockedMessage.textContent).toBe(strings.movementBlocked.message);
    expect(announcementEl.textContent).toBe(strings.movementBlocked.announcement);
    expect(getPosition()).toEqual({ row: 0, col: 0 });
    expect(getMoves()).toBe(0);
  });

  test('calls onMove with blocked:true for a wall and blocked:false with the new position for an open move', () => {
    const round = buildRound();
    const onMove = jest.fn();
    const { root } = renderMazeScreen(container, round, { onMove });

    fireEvent.keyDown(root, { key: 'ArrowLeft' });
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ direction: 'left', blocked: true }));

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'right', blocked: false, position: { row: 0, col: 1 }, moves: 1 })
    );
  });

  test('a click on an open direction button moves the dinosaur and refreshes control availability for the new cell', () => {
    const round = buildRound();
    const { controlButtons, getPosition } = renderMazeScreen(container, round);

    fireEvent.click(controlButtons.right);

    expect(getPosition()).toEqual({ row: 0, col: 1 });
    // At (0,1): north/east are walled, south/west are open.
    expect(controlButtons.up.disabled).toBe(true);
    expect(controlButtons.right.disabled).toBe(true);
    expect(controlButtons.down.disabled).toBe(false);
    expect(controlButtons.left.disabled).toBe(false);
  });

  test('reaching the goal (mid-game round) announces the result, hides controls and reveals "Siguiente"', () => {
    const round = buildRound();
    const { root, controlsGroup, resultBox, resultMessage, announcementEl, nextButton } = renderMazeScreen(
      container,
      round,
      { roundNumber: 3, totalRounds: 10 }
    );

    fireEvent.keyDown(root, { key: 'ArrowRight' }); // (0,0) -> (0,1)
    fireEvent.keyDown(root, { key: 'ArrowDown' }); // (0,1) -> (1,1) === goal

    expect(controlsGroup.hidden).toBe(true);
    expect(resultBox.hidden).toBe(false);
    expect(resultMessage.textContent).toBe(strings.roundResult.correctMessage);
    expect(announcementEl.textContent).toBe(strings.roundResult.foodDeliveredAnnouncementFormat.replace('{moves}', '2'));
    expect(nextButton.hidden).toBe(false);
    expect(nextButton).toHaveTextContent(strings.roundResult.nextButton);
  });

  test('clicking "Siguiente" after a mid-game round calls onNext with score + 1, never onGameOver', () => {
    const round = buildRound();
    const onNext = jest.fn();
    const onGameOver = jest.fn();
    const { root, nextButton } = renderMazeScreen(container, round, {
      roundNumber: 1,
      totalRounds: 10,
      score: 4,
      onNext,
      onGameOver,
    });

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    fireEvent.click(nextButton);

    expect(onNext).toHaveBeenCalledWith(5);
    expect(onGameOver).not.toHaveBeenCalled();
  });

  test('reaching the goal on the last round shows the gameOver heading/message and announces the final score', () => {
    const round = buildRound();
    const { root, resultHeading, resultMessage, announcementEl } = renderMazeScreen(container, round, {
      roundNumber: 10,
      totalRounds: 10,
      score: 9,
    });

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    fireEvent.keyDown(root, { key: 'ArrowDown' });

    expect(resultHeading.hidden).toBe(false);
    expect(resultHeading.textContent).toBe(strings.gameOver.heading);
    expect(resultMessage.textContent).toBe(strings.gameOver.message);
    expect(announcementEl.textContent).toBe(
      strings.gameOver.announcementFormat.replace('{score}', '10').replace('{total}', '10')
    );
  });

  test('clicking "Siguiente" on the last round calls onGameOver with the final score, never onNext', () => {
    const round = buildRound();
    const onNext = jest.fn();
    const onGameOver = jest.fn();
    const { root, nextButton } = renderMazeScreen(container, round, {
      roundNumber: 10,
      totalRounds: 10,
      score: 9,
      onNext,
      onGameOver,
    });

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    fireEvent.click(nextButton);

    expect(onGameOver).toHaveBeenCalledWith(10);
    expect(onNext).not.toHaveBeenCalled();
  });

  test('announces the round change on mount', () => {
    const round = buildRound();
    const { announcementEl } = renderMazeScreen(container, round, { roundNumber: 4, totalRounds: 10 });

    expect(announcementEl.textContent).toBe(
      strings.roundChangeAnnouncementFormat.replace('{current}', '4').replace('{total}', '10')
    );
    expect(announcementEl).toHaveAttribute('role', 'status');
    expect(announcementEl).toHaveAttribute('aria-live', 'polite');
  });

  test('shows a visible legend using dinosaurAlt/foodAlt so the icons are never conveyed by shape/color alone', () => {
    const round = buildRound();
    const { legend } = renderMazeScreen(container, round);

    expect(legend.hidden).toBeFalsy();
    expect(legend.textContent).toContain(strings.dinosaurAlt);
    expect(legend.textContent).toContain(strings.foodAlt);
  });

  test('ignores further moves once the round is finished', () => {
    const round = buildRound();
    const onMove = jest.fn();
    const { root, getMoves, isFinished } = renderMazeScreen(container, round, { onMove });

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    expect(isFinished()).toBe(true);

    onMove.mockClear();
    fireEvent.keyDown(root, { key: 'ArrowUp' });
    expect(onMove).not.toHaveBeenCalled();
    expect(getMoves()).toBe(2);
  });

  test('the board CSS caps its width so a 9-column (hardest level) maze never forces horizontal scroll at 375px', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const boardRuleMatch = css.match(/\.maze-screen__board\s*\{([^}]*)\}/);
    expect(boardRuleMatch).not.toBeNull();
    expect(boardRuleMatch[1]).toMatch(/width:\s*min\(100%,\s*320px\)/);
  });
});
