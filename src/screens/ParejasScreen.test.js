'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getAllByRole, fireEvent } = require('@testing-library/dom');

const { renderParejasScreen, MISMATCH_RESET_DELAY_MS } = require('./ParejasScreen');
const { parejas: strings } = require('../../public/i18n/es.json');
const { startRound, CARD_STATES } = require('../game/parejasGame');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

/**
 * A tiny, deterministic 2x2 board (4 cards, 2 pairs) instead of
 * `parejasGame.startRound`'s randomized shuffle, so tests can assert exact
 * card identities/positions. Card 0 (trex) pairs with card 2, card 1
 * (triceratops) pairs with card 3.
 */
function buildRound(overrides = {}) {
  return {
    roundIndex: 0,
    level: 3,
    seed: 'seed',
    pairCount: 2,
    columns: 2,
    rows: 2,
    cards: [
      { cardId: 0, creatureId: 'trex', pairId: 0, state: 'hidden', position: { row: 0, col: 0 } },
      { cardId: 1, creatureId: 'triceratops', pairId: 1, state: 'hidden', position: { row: 0, col: 1 } },
      { cardId: 2, creatureId: 'trex', pairId: 0, state: 'hidden', position: { row: 1, col: 0 } },
      { cardId: 3, creatureId: 'triceratops', pairId: 1, state: 'hidden', position: { row: 1, col: 1 } },
    ],
    revealedCardIds: [],
    matchedPairs: 0,
    attempts: 0,
    mismatches: 0,
    softAttemptLimit: 2,
    softLimitReached: false,
    status: 'playing',
    blocked: false,
    evaluated: false,
    ...overrides,
  };
}

describe('ParejasScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    jest.useRealTimers();
  });

  test('renders the title, instructions, round progress and level from the real es.json strings', () => {
    const round = buildRound();
    renderParejasScreen(container, round, { roundNumber: 2, totalRounds: 10 });

    expect(container.textContent).toContain(strings.screenTitle);
    expect(container.textContent).toContain(strings.instructions);
    expect(container.textContent).toContain('Ronda 2 de 10');
    expect(container.textContent).toContain('Nivel 3');
  });

  test('renders the board as a labeled group with one accessible card button per board position', () => {
    const round = buildRound();
    const { board, cardButtons } = renderParejasScreen(container, round);

    expect(board).toHaveAttribute('role', 'group');
    expect(board).toHaveAttribute('aria-label', strings.boardLabel);
    expect(cardButtons).toHaveLength(4);
    const buttons = getAllByRole(container, 'button').filter((button) =>
      button.className.indexOf('parejas-screen__card') === 0
    );
    expect(buttons).toHaveLength(4);
  });

  test('every card starts hidden: face-down aria-label, aria-pressed false, back.svg image', () => {
    const round = buildRound();
    const { cardButtons } = renderParejasScreen(container, round);

    cardButtons.forEach((button, index) => {
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button.getAttribute('aria-label')).toBe(
        strings.card.hiddenAriaLabelFormat.replace('{position}', String(index + 1))
      );
      expect(button.querySelector('.parejas-screen__card-image').src).toContain('/assets/images/cards/back.svg');
      expect(button.querySelector('.parejas-screen__card-image').getAttribute('aria-hidden')).toBe('true');
    });
  });

  test('activating a hidden card flips it: reveals the creature image and an ARIA label with position + identity', () => {
    const round = buildRound();
    const { cardButtons } = renderParejasScreen(container, round);

    fireEvent.click(cardButtons[0]);

    expect(cardButtons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(cardButtons[0].getAttribute('aria-label')).toBe(
      strings.card.revealedAriaLabelFormat.replace('{position}', '1').replace('{creature}', strings.dinosaurNames.trex)
    );
    expect(cardButtons[0].querySelector('.parejas-screen__card-image').src).toContain('/assets/images/dinosaurs/trex.svg');
  });

  test('a third reveal attempt while two cards are already face up is blocked and announced, not silently ignored', () => {
    const round = buildRound();
    const { cardButtons, matchMessage, announcementEl } = renderParejasScreen(container, round);

    fireEvent.click(cardButtons[0]); // trex
    fireEvent.click(cardButtons[1]); // triceratops (mismatch, resolving)
    fireEvent.click(cardButtons[2]); // blocked: still resolving

    expect(matchMessage.textContent).toBe(strings.feedback.blockedMessage);
    expect(announcementEl.textContent).toBe(strings.feedback.blockedAnnouncement);
    expect(cardButtons[2]).toHaveAttribute('aria-pressed', 'false');
  });

  test('two matching cards flip to matched immediately: disabled, badge visible, match announced, progress updated', () => {
    const round = buildRound();
    const { cardButtons, matchMessage, announcementEl, progressText } = renderParejasScreen(container, round);

    fireEvent.click(cardButtons[0]); // trex
    fireEvent.click(cardButtons[2]); // trex -> match

    expect(cardButtons[0].disabled).toBe(true);
    expect(cardButtons[2].disabled).toBe(true);
    expect(cardButtons[0].querySelector('.parejas-screen__card-badge').hidden).toBe(false);
    expect(cardButtons[0].getAttribute('aria-label')).toBe(
      strings.card.matchedAriaLabelFormat.replace('{position}', '1').replace('{creature}', strings.dinosaurNames.trex)
    );

    const expectedMessage = strings.feedback.matchMessageFormat.replace('{creature}', strings.dinosaurNames.trex);
    expect(matchMessage.textContent).toBe(expectedMessage);
    expect(announcementEl.textContent).toBe(expectedMessage);
    expect(progressText.textContent).toBe(strings.progressFormat.replace('{matched}', '1').replace('{total}', '2'));
  });

  test('two mismatching cards flip back to hidden after MISMATCH_RESET_DELAY_MS, not instantly and not never', () => {
    jest.useFakeTimers();
    const round = buildRound();
    const { cardButtons, matchMessage, announcementEl } = renderParejasScreen(container, round);

    fireEvent.click(cardButtons[0]); // trex
    fireEvent.click(cardButtons[1]); // triceratops -> mismatch

    const expectedMessage = strings.feedback.mismatchMessageFormat
      .replace('{first}', strings.dinosaurNames.trex)
      .replace('{second}', strings.dinosaurNames.triceratops);
    expect(matchMessage.textContent).toBe(expectedMessage);
    expect(announcementEl.textContent).toBe(expectedMessage);
    // Still visible right after the mismatch -- not flipped back yet.
    expect(cardButtons[0]).toHaveAttribute('aria-pressed', 'true');

    jest.advanceTimersByTime(MISMATCH_RESET_DELAY_MS);

    expect(cardButtons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(cardButtons[1]).toHaveAttribute('aria-pressed', 'false');
    expect(cardButtons[0].querySelector('.parejas-screen__card-image').src).toContain('/assets/images/cards/back.svg');
  });

  test('calls onReveal and onResolve so a caller can mirror the attempt into parejasGame.js', () => {
    const round = buildRound();
    const onReveal = jest.fn();
    const onResolve = jest.fn();
    const { cardButtons } = renderParejasScreen(container, round, { onReveal, onResolve });

    fireEvent.click(cardButtons[0]);
    expect(onReveal).toHaveBeenCalledWith({ cardId: 0, blocked: false });

    fireEvent.click(cardButtons[2]);
    expect(onResolve).toHaveBeenCalledWith(
      expect.objectContaining({ matched: true, firstCardId: 0, secondCardId: 2, attempts: 1 })
    );
  });

  test('completing every pair on a mid-game round shows the round result and reveals "Siguiente"', () => {
    const round = buildRound();
    const { cardButtons, resultBox, resultHeading, resultMessage, nextButton } = renderParejasScreen(
      container,
      round,
      { roundNumber: 3, totalRounds: 10 }
    );

    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[2]); // trex match
    fireEvent.click(cardButtons[1]);
    fireEvent.click(cardButtons[3]); // triceratops match -> round complete

    expect(resultBox.hidden).toBe(false);
    expect(resultHeading.hidden).toBe(true);
    expect(resultMessage.textContent).toBe(
      strings.roundResult.correctMessageFormat.replace('{total}', '2').replace('{attempts}', '2')
    );
    expect(nextButton.hidden).toBe(false);
  });

  test('clicking "Siguiente" after a mid-game round calls onNext with score + 1, never onGameOver', () => {
    const round = buildRound();
    const onNext = jest.fn();
    const onGameOver = jest.fn();
    const { cardButtons, nextButton } = renderParejasScreen(container, round, {
      roundNumber: 1,
      totalRounds: 10,
      score: 4,
      onNext,
      onGameOver,
    });

    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[2]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(cardButtons[3]);
    fireEvent.click(nextButton);

    expect(onNext).toHaveBeenCalledWith(5);
    expect(onGameOver).not.toHaveBeenCalled();
  });

  test('completing the last round shows the gameOver heading/message and calls onGameOver with the final score', () => {
    const round = buildRound();
    const onNext = jest.fn();
    const onGameOver = jest.fn();
    const { cardButtons, resultHeading, resultMessage, announcementEl, nextButton } = renderParejasScreen(
      container,
      round,
      { roundNumber: 10, totalRounds: 10, score: 9, onNext, onGameOver }
    );

    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[2]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(cardButtons[3]);

    expect(resultHeading.hidden).toBe(false);
    expect(resultHeading.textContent).toBe(strings.gameOver.heading);
    expect(resultMessage.textContent).toBe(strings.gameOver.message);
    expect(announcementEl.textContent).toBe(
      strings.gameOver.announcementFormat.replace('{score}', '10').replace('{total}', '10')
    );

    fireEvent.click(nextButton);
    expect(onGameOver).toHaveBeenCalledWith(10);
    expect(onNext).not.toHaveBeenCalled();
  });

  test('ignores further card taps once the round is finished', () => {
    const round = buildRound();
    const onReveal = jest.fn();
    const { cardButtons, isFinished } = renderParejasScreen(container, round, { onReveal });

    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[2]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(cardButtons[3]);
    expect(isFinished()).toBe(true);

    onReveal.mockClear();
    fireEvent.click(cardButtons[0]);
    expect(onReveal).not.toHaveBeenCalled();
  });

  test('announces the round change on mount', () => {
    const round = buildRound();
    const { announcementEl } = renderParejasScreen(container, round, { roundNumber: 4, totalRounds: 10 });

    expect(announcementEl.textContent).toBe(
      strings.roundChangeAnnouncementFormat.replace('{current}', '4').replace('{total}', '10')
    );
    expect(announcementEl).toHaveAttribute('role', 'status');
    expect(announcementEl).toHaveAttribute('aria-live', 'polite');
  });

  test('every hidden card is disabled while a mismatch is resolving, so a tap cannot race past MAX_VISIBLE_UNMATCHED', () => {
    jest.useFakeTimers();
    const round = buildRound();
    const { cardButtons } = renderParejasScreen(container, round);

    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]); // mismatch, resolving

    expect(cardButtons[2].disabled).toBe(true);
    expect(cardButtons[3].disabled).toBe(true);

    jest.advanceTimersByTime(MISMATCH_RESET_DELAY_MS);

    expect(cardButtons[2].disabled).toBe(false);
    expect(cardButtons[3].disabled).toBe(false);
  });

  test('renders a real parejasGame.js board (all pairs, columns/rows honored) without crashing', () => {
    const round = startRound({ roundIndex: 0, level: 1, seed: 'test-seed', randomFn: () => 0.42 });
    const { cardButtons, board } = renderParejasScreen(container, round, { roundNumber: 1, totalRounds: 10 });

    expect(cardButtons).toHaveLength(round.cards.length);
    expect(board.style.getPropertyValue('--parejas-cols')).toBe(String(round.columns));
    expect(board.style.getPropertyValue('--parejas-rows')).toBe(String(round.rows));
    cardButtons.forEach((button) => {
      expect(button.querySelectorAll('.parejas-screen__card-image')).toHaveLength(1);
    });
    expect(round.cards.every((card) => card.state === CARD_STATES.HIDDEN)).toBe(true);
  });

  test('the board CSS caps its width so a 4x4 (hardest level) board never forces horizontal scroll at 375px', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const boardRuleMatch = css.match(/\.parejas-screen__board\s*\{([^}]*)\}/);
    expect(boardRuleMatch).not.toBeNull();
    expect(boardRuleMatch[1]).toMatch(/width:\s*min\(100%,\s*320px\)/);
  });

  test('every interactive card meets the shared 48px minimum tap target', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const cardRuleMatch = css.match(/\.parejas-screen__card\s*\{([^}]*)\}/);
    expect(cardRuleMatch).not.toBeNull();
    expect(cardRuleMatch[1]).toMatch(/min-width:\s*var\(--tap-target-min\)/);
    expect(cardRuleMatch[1]).toMatch(/min-height:\s*var\(--tap-target-min\)/);
  });
});
