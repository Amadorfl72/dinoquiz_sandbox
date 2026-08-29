'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getAllByRole, fireEvent } = require('@testing-library/dom');

const { renderSizeOrderScreen, validateRound, STATUS } = require('./SizeOrderScreen');
const { sizeOrder: strings } = require('../../public/i18n/es.json');
const { generateSizeOrderRound } = require('../game/sizeOrderRoundGenerator');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');
const SCREEN_SOURCE_PATH = path.resolve(__dirname, '../../public/scripts/sizeOrderScreen.js');

/** Mirrors sizeOrderScreen.js's own formatTemplate: replaces every occurrence of each "{key}", not just the first. */
function format(template, values) {
  return Object.keys(values).reduce((result, key) => result.split(`{${key}}`).join(String(values[key])), template);
}

// renderSizeOrderScreen locks a round id across renders (module-scoped, by
// design -- see sizeOrderScreen.js's own doc comment), and this one test
// module's `require` cache is shared by every `test()` below. Each fixture
// therefore gets its own fresh id by default, so one test confirming a round
// never leaves it locked for the next test that happens to reuse the same
// creature/order combination; a test that wants the lock (the "re-render an
// evaluated round" one) opts in explicitly via `overrides.roundId`.
let roundIdCounter = 0;
function nextRoundId() {
  roundIdCounter += 1;
  return `test-round-${roundIdCounter}`;
}

/**
 * A deterministic 3-creature round (unique lengths, ascending correct order
 * velociraptor(2) < triceratops(9) < trex(12)); `initialOrder` starts with
 * trex/velociraptor swapped so exactly one swap is needed to solve it.
 */
function buildRound(overrides = {}) {
  return {
    roundId: nextRoundId(),
    creatureCount: 3,
    creatures: [
      { id: 'trex', lengthMeters: 12 },
      { id: 'velociraptor', lengthMeters: 2 },
      { id: 'triceratops', lengthMeters: 9 },
    ],
    correctOrder: ['velociraptor', 'triceratops', 'trex'],
    initialOrder: ['trex', 'velociraptor', 'triceratops'],
    ...overrides,
  };
}

/** A 4-creature variant, already-solved order (no swap needed for a "correct" test). */
function buildFourCreatureRound(overrides = {}) {
  return {
    roundId: nextRoundId(),
    creatureCount: 4,
    creatures: [
      { id: 'compsognathus', lengthMeters: 1 },
      { id: 'velociraptor', lengthMeters: 2 },
      { id: 'triceratops', lengthMeters: 9 },
      { id: 'trex', lengthMeters: 12 },
    ],
    correctOrder: ['compsognathus', 'velociraptor', 'triceratops', 'trex'],
    initialOrder: ['compsognathus', 'velociraptor', 'triceratops', 'trex'],
    ...overrides,
  };
}

describe('SizeOrderScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the title, instructions, round progress and the initial order for 3 creatures', () => {
    const round = buildRound();
    const { board } = renderSizeOrderScreen(container, round, { roundNumber: 2, totalRounds: 10 });

    expect(container.textContent).toContain(strings.screenTitle);
    expect(container.textContent).toContain(strings.instructions);
    expect(container.textContent).toContain('Ronda 2 de 10');

    const buttons = getAllByRole(board, 'button');
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.textContent)).toEqual([
      expect.stringContaining(strings.dinosaurNames.trex),
      expect.stringContaining(strings.dinosaurNames.velociraptor),
      expect.stringContaining(strings.dinosaurNames.triceratops),
    ]);
  });

  test('renders the title, instructions, round progress and the initial order for 4 creatures', () => {
    const round = buildFourCreatureRound();
    const { board } = renderSizeOrderScreen(container, round, { roundNumber: 5, totalRounds: 10 });

    const buttons = getAllByRole(board, 'button');
    expect(buttons).toHaveLength(4);
    expect(buttons.map((button) => button.textContent)).toEqual([
      expect.stringContaining(strings.dinosaurNames.compsognathus),
      expect.stringContaining(strings.dinosaurNames.velociraptor),
      expect.stringContaining(strings.dinosaurNames.triceratops),
      expect.stringContaining(strings.dinosaurNames.trex),
    ]);
  });

  test('starts in "lista" with a board group labeled from es.json and no revealed lengths', () => {
    const round = buildRound();
    const { board, getStatus } = renderSizeOrderScreen(container, round);

    expect(getStatus()).toBe(STATUS.LISTA);
    expect(board).toHaveAttribute('role', 'group');
    expect(board).toHaveAttribute('aria-label', strings.boardLabel);
    expect(container.textContent).not.toMatch(/12 metros|9 metros|2 metros/);
  });

  test('activating a creature selects it: aria-pressed true, visible badge, announced, state moves to primera-seleccion', () => {
    const round = buildRound();
    const { creatureButtons, announcementEl, getStatus } = renderSizeOrderScreen(container, round);

    fireEvent.click(creatureButtons.trex);

    expect(getStatus()).toBe(STATUS.PRIMERA_SELECCION);
    expect(creatureButtons.trex).toHaveAttribute('aria-pressed', 'true');
    expect(creatureButtons.trex.querySelector('.size-order-screen__creature-badge').hidden).toBe(false);
    expect(announcementEl.textContent).toBe(
      format(strings.selection.selectedAnnouncementFormat, { dinosaur: strings.dinosaurNames.trex, position: '1', total: '3' })
    );
  });

  test('re-activating the same selected creature cancels the selection without swapping and returns to lista', () => {
    const round = buildRound();
    const { creatureButtons, announcementEl, getStatus, getOrder } = renderSizeOrderScreen(container, round);

    fireEvent.click(creatureButtons.trex);
    fireEvent.click(creatureButtons.trex);

    expect(getStatus()).toBe(STATUS.LISTA);
    expect(getOrder()).toEqual(['trex', 'velociraptor', 'triceratops']);
    expect(creatureButtons.trex).toHaveAttribute('aria-pressed', 'false');
    expect(creatureButtons.trex.querySelector('.size-order-screen__creature-badge').hidden).toBe(true);
    expect(announcementEl.textContent).toBe(
      strings.selection.deselectAnnouncementFormat.replace('{dinosaur}', strings.dinosaurNames.trex)
    );
  });

  test('activating a different creature swaps their positions, clears the selection and returns to lista', () => {
    const round = buildRound();
    const { creatureButtons, announcementEl, getStatus, getOrder } = renderSizeOrderScreen(container, round);

    fireEvent.click(creatureButtons.trex); // position 1
    fireEvent.click(creatureButtons.velociraptor); // position 2 -> swap

    expect(getStatus()).toBe(STATUS.LISTA);
    expect(getOrder()).toEqual(['velociraptor', 'trex', 'triceratops']);
    expect(creatureButtons.trex).toHaveAttribute('aria-pressed', 'false');
    expect(creatureButtons.velociraptor).toHaveAttribute('aria-pressed', 'false');
    expect(creatureButtons.trex.getAttribute('aria-label')).toBe(
      format(strings.selection.selectAriaLabelFormat, { dinosaur: strings.dinosaurNames.trex, position: '2', total: '3' })
    );
    expect(announcementEl.textContent).toBe(
      format(strings.selection.swapAnnouncementFormat, {
        firstDinosaur: strings.dinosaurNames.trex,
        secondDinosaur: strings.dinosaurNames.velociraptor,
        firstPosition: '2',
        secondPosition: '1',
        total: '3',
      })
    );
  });

  test('an identity-anchored swap never changes any creature\'s image src or name, only its position', () => {
    const round = buildRound();
    const { creatureButtons, getOrder } = renderSizeOrderScreen(container, round);

    fireEvent.click(creatureButtons.trex);
    fireEvent.click(creatureButtons.velociraptor);

    expect(getOrder()).toEqual(['velociraptor', 'trex', 'triceratops']);
    expect(creatureButtons.trex.querySelector('.size-order-screen__creature-image').src).toContain('/assets/images/dinosaurs/trex.svg');
    expect(creatureButtons.trex.querySelector('.size-order-screen__creature-name').textContent).toBe(strings.dinosaurNames.trex);
    expect(creatureButtons.velociraptor.querySelector('.size-order-screen__creature-image').src).toContain(
      '/assets/images/dinosaurs/velociraptor.svg'
    );
  });

  test('several successive swaps before confirming all apply correctly', () => {
    const round = buildFourCreatureRound({
      initialOrder: ['trex', 'triceratops', 'velociraptor', 'compsognathus'],
    });
    const { creatureButtons, getOrder } = renderSizeOrderScreen(container, round);

    fireEvent.click(creatureButtons.trex);
    fireEvent.click(creatureButtons.compsognathus); // trex <-> compsognathus
    expect(getOrder()).toEqual(['compsognathus', 'triceratops', 'velociraptor', 'trex']);

    fireEvent.click(creatureButtons.triceratops);
    fireEvent.click(creatureButtons.velociraptor); // triceratops <-> velociraptor
    expect(getOrder()).toEqual(['compsognathus', 'velociraptor', 'triceratops', 'trex']);

    fireEvent.click(creatureButtons.compsognathus);
    fireEvent.click(creatureButtons.velociraptor); // compsognathus <-> velociraptor
    expect(getOrder()).toEqual(['velociraptor', 'compsognathus', 'triceratops', 'trex']);
  });

  test('Enter and Space activate creature selection/swap exactly like a click, and keep focus on the just-activated control', () => {
    const round = buildRound();
    const { creatureButtons, getStatus, getOrder } = renderSizeOrderScreen(container, round);

    creatureButtons.trex.focus();
    fireEvent.keyDown(creatureButtons.trex, { key: 'Enter' });
    expect(getStatus()).toBe(STATUS.PRIMERA_SELECCION);
    expect(creatureButtons.trex).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(creatureButtons.velociraptor, { key: ' ' });
    expect(getStatus()).toBe(STATUS.LISTA);
    expect(getOrder()).toEqual(['velociraptor', 'trex', 'triceratops']);
    expect(document.activeElement).toBe(creatureButtons.velociraptor);
  });

  test('Enter and Space confirm the order exactly once when the confirm control is enabled', () => {
    const round = buildRound({ initialOrder: ['velociraptor', 'triceratops', 'trex'] });
    const onAnswer = jest.fn();
    const { confirmButton, getStatus } = renderSizeOrderScreen(container, round, { onAnswer });

    fireEvent.keyDown(confirmButton, { key: 'Enter' });

    expect(getStatus()).toBe(STATUS.EVALUADA);
    expect(onAnswer).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(confirmButton, { key: ' ' });
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  test('aria-live messages cover selection, cancellation and swap, all through the same single region', () => {
    const round = buildRound();
    const { creatureButtons, announcementEl } = renderSizeOrderScreen(container, round);

    fireEvent.click(creatureButtons.trex);
    expect(announcementEl.textContent).toContain(strings.dinosaurNames.trex);

    fireEvent.click(creatureButtons.trex);
    expect(announcementEl.textContent).toBe(
      strings.selection.deselectAnnouncementFormat.replace('{dinosaur}', strings.dinosaurNames.trex)
    );

    fireEvent.click(creatureButtons.trex);
    fireEvent.click(creatureButtons.velociraptor);
    expect(announcementEl.textContent).toContain(strings.dinosaurNames.trex);
    expect(announcementEl.textContent).toContain(strings.dinosaurNames.velociraptor);

    expect(announcementEl).toHaveAttribute('role', 'status');
    expect(announcementEl).toHaveAttribute('aria-live', 'polite');
    // Exactly one live region ever gets written to for these events.
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1);
  });

  test('confirming a correct order announces success once and reveals the correct order with real lengths', () => {
    const round = buildRound({ initialOrder: ['velociraptor', 'triceratops', 'trex'] });
    const onAnswer = jest.fn();
    const { confirmButton, resultLabel, resultMessage, solutionList, announcementEl, getStatus } = renderSizeOrderScreen(
      container,
      round,
      { onAnswer }
    );

    fireEvent.click(confirmButton);

    expect(getStatus()).toBe(STATUS.EVALUADA);
    expect(resultLabel.textContent).toBe(strings.feedback.correctLabel);
    expect(resultMessage.textContent).toBe(strings.feedback.correct);
    expect(solutionList.textContent).toContain(strings.dinosaurNames.velociraptor);
    expect(solutionList.textContent).toContain('2 metros');
    expect(solutionList.textContent).toContain(strings.dinosaurNames.triceratops);
    expect(solutionList.textContent).toContain('9 metros');
    expect(solutionList.textContent).toContain(strings.dinosaurNames.trex);
    expect(solutionList.textContent).toContain('12 metros');
    expect(announcementEl.textContent).toContain(strings.dinosaurNames.velociraptor);
    expect(onAnswer).toHaveBeenCalledWith({
      roundId: round.roundId,
      isCorrect: true,
      order: ['velociraptor', 'triceratops', 'trex'],
      correctOrder: ['velociraptor', 'triceratops', 'trex'],
    });
  });

  test('confirming an incorrect order still announces the outcome once and reveals the correct order with real lengths', () => {
    const round = buildRound({ initialOrder: ['trex', 'velociraptor', 'triceratops'] });
    const onAnswer = jest.fn();
    const { confirmButton, resultLabel, resultMessage, solutionList, getStatus } = renderSizeOrderScreen(container, round, {
      onAnswer,
    });

    fireEvent.click(confirmButton);

    expect(getStatus()).toBe(STATUS.EVALUADA);
    expect(resultLabel.textContent).toBe(strings.feedback.incorrectLabel);
    expect(resultMessage.textContent).toBe(strings.feedback.incorrect);
    expect(solutionList.textContent).toContain('2 metros');
    expect(solutionList.textContent).toContain('9 metros');
    expect(solutionList.textContent).toContain('12 metros');
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ roundId: round.roundId, isCorrect: false, correctOrder: ['velociraptor', 'triceratops', 'trex'] })
    );
  });

  test('confirming while a first selection is pending clears it without swapping, then evaluates the order as-is', () => {
    const round = buildRound({ initialOrder: ['velociraptor', 'triceratops', 'trex'] });
    const onAnswer = jest.fn();
    const { creatureButtons, confirmButton, getOrder } = renderSizeOrderScreen(container, round, { onAnswer });

    fireEvent.click(creatureButtons.velociraptor); // pending first selection
    fireEvent.click(confirmButton);

    expect(getOrder()).toEqual(['velociraptor', 'triceratops', 'trex']);
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: true }));
  });

  test('double-clicking confirm only calls onAnswer once', () => {
    const round = buildRound({ initialOrder: ['velociraptor', 'triceratops', 'trex'] });
    const onAnswer = jest.fn();
    const { confirmButton } = renderSizeOrderScreen(container, round, { onAnswer });

    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  test('after evaluation, clicks/taps/Enter/Space on creature and confirm controls change nothing and never call onAnswer again', () => {
    const round = buildRound({ initialOrder: ['velociraptor', 'triceratops', 'trex'] });
    const onAnswer = jest.fn();
    const { creatureButtons, confirmButton, getOrder, getStatus } = renderSizeOrderScreen(container, round, { onAnswer });

    fireEvent.click(confirmButton);
    onAnswer.mockClear();

    expect(creatureButtons.trex.disabled).toBe(true);
    expect(creatureButtons.velociraptor.disabled).toBe(true);
    expect(creatureButtons.triceratops.disabled).toBe(true);
    expect(confirmButton.disabled).toBe(true);

    fireEvent.click(creatureButtons.trex);
    fireEvent.click(creatureButtons.velociraptor);
    fireEvent.keyDown(creatureButtons.trex, { key: 'Enter' });
    fireEvent.keyDown(confirmButton, { key: ' ' });
    fireEvent.click(confirmButton);

    expect(getStatus()).toBe(STATUS.EVALUADA);
    expect(getOrder()).toEqual(['velociraptor', 'triceratops', 'trex']);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  test('a new round id resets the board to lista, and re-rendering the same already-evaluated round id stays locked without re-emitting onAnswer', () => {
    const round = buildRound({ initialOrder: ['trex', 'velociraptor', 'triceratops'] });
    const onAnswer = jest.fn();

    const first = renderSizeOrderScreen(container, round, { onAnswer });
    fireEvent.click(first.confirmButton);
    expect(onAnswer).toHaveBeenCalledTimes(1);

    // Re-rendering the exact same round id: still locked, callback not re-fired.
    const rerendered = renderSizeOrderScreen(container, round, { onAnswer });
    expect(rerendered.getStatus()).toBe(STATUS.EVALUADA);
    expect(rerendered.creatureButtons.trex.disabled).toBe(true);
    fireEvent.click(rerendered.creatureButtons.trex);
    expect(onAnswer).toHaveBeenCalledTimes(1);

    // A genuinely new round id starts clean.
    const nextRound = buildRound({ roundId: 'round-3-b', initialOrder: ['trex', 'velociraptor', 'triceratops'] });
    const fresh = renderSizeOrderScreen(container, nextRound, { onAnswer });
    expect(fresh.getStatus()).toBe(STATUS.LISTA);
    expect(fresh.creatureButtons.trex.disabled).toBe(false);
  });

  test('destroy() prevents any further callback from a screen the caller has abandoned', () => {
    const round = buildRound({ roundId: 'round-destroy', initialOrder: ['velociraptor', 'triceratops', 'trex'] });
    const onAnswer = jest.fn();
    const { confirmButton, destroy } = renderSizeOrderScreen(container, round, { onAnswer });

    destroy();
    fireEvent.click(confirmButton);

    expect(onAnswer).not.toHaveBeenCalled();
  });

  describe('invalid round data -> error-de-datos', () => {
    test('fewer than 3 creatures is invalid', () => {
      const round = buildRound({
        creatures: [
          { id: 'trex', lengthMeters: 12 },
          { id: 'velociraptor', lengthMeters: 2 },
        ],
        initialOrder: ['trex', 'velociraptor'],
      });
      expect(validateRound(round)).toBeNull();
    });

    test('more than 4 creatures is invalid', () => {
      const round = buildFourCreatureRound({
        creatures: [
          { id: 'compsognathus', lengthMeters: 1 },
          { id: 'velociraptor', lengthMeters: 2 },
          { id: 'triceratops', lengthMeters: 9 },
          { id: 'trex', lengthMeters: 12 },
          { id: 'diplodocus', lengthMeters: 25 },
        ],
        initialOrder: ['compsognathus', 'velociraptor', 'triceratops', 'trex', 'diplodocus'],
      });
      expect(validateRound(round)).toBeNull();
    });

    test('duplicated ids in the order is invalid', () => {
      const round = buildRound({ initialOrder: ['trex', 'trex', 'velociraptor'] });
      expect(validateRound(round)).toBeNull();
    });

    test('an id in the order with no matching ficha is invalid', () => {
      const round = buildRound({ initialOrder: ['trex', 'velociraptor', 'unknown-creature'] });
      expect(validateRound(round)).toBeNull();
    });

    test.each([
      ['zero', 0],
      ['negative', -5],
      ['non-numeric', 'twelve'],
      ['NaN', NaN],
      ['Infinity', Infinity],
    ])('a %s lengthMeters is invalid', (_label, lengthMeters) => {
      const round = buildRound({
        creatures: [
          { id: 'trex', lengthMeters },
          { id: 'velociraptor', lengthMeters: 2 },
          { id: 'triceratops', lengthMeters: 9 },
        ],
      });
      expect(validateRound(round)).toBeNull();
    });

    test('two creatures tied on lengthMeters is invalid (no single correct order)', () => {
      const round = buildRound({
        creatures: [
          { id: 'trex', lengthMeters: 9 },
          { id: 'velociraptor', lengthMeters: 2 },
          { id: 'triceratops', lengthMeters: 9 },
        ],
      });
      expect(validateRound(round)).toBeNull();
    });

    test('an invalid round renders a localized, announceable error and no confirmable board', () => {
      const round = buildRound({ initialOrder: ['trex', 'trex', 'velociraptor'] });
      const result = renderSizeOrderScreen(container, round);

      expect(result.getStatus()).toBe(STATUS.ERROR_DE_DATOS);
      expect(container.querySelector('.size-order-screen__board')).toBeNull();
      expect(container.querySelector('.size-order-screen__confirm-button')).toBeNull();
      expect(container.textContent).toContain(strings.dataError.message);
      const errorEl = container.querySelector('[role="status"]');
      expect(errorEl).toHaveAttribute('aria-live', 'polite');
    });
  });

  test('evaluation and displayed meters come from the ficha única (round.creatures by id), not from a positionally-duplicated view model', () => {
    // creatures is deliberately NOT in initialOrder's order, so a bug that
    // read lengths positionally (instead of by id) would misorder/mislabel.
    const round = {
      roundId: 'round-shuffled-ficha',
      creatures: [
        { id: 'triceratops', lengthMeters: 9 },
        { id: 'trex', lengthMeters: 12 },
        { id: 'velociraptor', lengthMeters: 2 },
      ],
      initialOrder: ['trex', 'velociraptor', 'triceratops'],
    };
    const { confirmButton, solutionList, getStatus } = renderSizeOrderScreen(container, round);

    fireEvent.click(confirmButton);

    expect(getStatus()).toBe(STATUS.EVALUADA);
    const items = Array.from(solutionList.children).map((li) => li.textContent);
    expect(items).toEqual([
      `${strings.dinosaurNames.velociraptor}: 2 metros`,
      `${strings.dinosaurNames.triceratops}: 9 metros`,
      `${strings.dinosaurNames.trex}: 12 metros`,
    ]);
  });

  test('renders a real sizeOrderRoundGenerator.js round without throwing, honoring its initialOrder', () => {
    const generated = generateSizeOrderRound({ seed: 'a-fixed-seed', creatureCount: 3 });
    expect(generated.error).toBeUndefined();

    const round = { roundId: 'generated-round', ...generated };
    const { board, getOrder } = renderSizeOrderScreen(container, round);

    expect(getAllByRole(board, 'button')).toHaveLength(3);
    expect(getOrder()).toEqual(generated.initialOrder);
  });

  test('does not hardcode copy: every visible/announced string traces back to es.json sizeOrder strings', () => {
    const round = buildRound({ initialOrder: ['trex', 'velociraptor', 'triceratops'] });
    const { creatureButtons, confirmButton } = renderSizeOrderScreen(container, round, { roundNumber: 1, totalRounds: 10 });

    expect(container.textContent).toContain(strings.screenTitle);
    expect(container.textContent).toContain(strings.instructions);
    expect(confirmButton.textContent).toBe(strings.confirmButton);
    expect(creatureButtons.trex.getAttribute('aria-label')).toBe(
      format(strings.selection.selectAriaLabelFormat, { dinosaur: strings.dinosaurNames.trex, position: '1', total: '3' })
    );
  });

  test('every sizeOrder i18n key referenced by the screen source exists in es.json', () => {
    const source = fs.readFileSync(SCREEN_SOURCE_PATH, 'utf8');
    // Strip block comments first: the file's doc comment mentions
    // "strings.sizeOrder" in prose, which isn't a real property access.
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const keyPaths = [...codeOnly.matchAll(/\bstrings\.([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)/g)].map((match) => match[1]);
    expect(keyPaths.length).toBeGreaterThan(0);

    const missing = keyPaths.filter((keyPath) => {
      const value = keyPath.split('.').reduce((obj, key) => (obj ? obj[key] : undefined), strings);
      return value === undefined;
    });
    expect(missing).toEqual([]);
  });

  test('the root container caps its width so nothing forces horizontal scroll at 375px, in every one of the four states', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const rootRuleMatch = css.match(/\.size-order-screen\s*\{([^}]*)\}/);
    expect(rootRuleMatch).not.toBeNull();
    expect(rootRuleMatch[1]).toMatch(/max-width:\s*400px/);
    expect(rootRuleMatch[1]).toMatch(/width:\s*100%/);
    expect(rootRuleMatch[1]).toMatch(/box-sizing:\s*border-box/);

    // The same .size-order-screen root wraps lista/primera-seleccion/evaluada
    // content and error-de-datos content alike (renderDataErrorState appends
    // straight into it), so this one rule governs all four states.
    const errorRuleMatch = css.match(/\.size-order-screen__data-error\s*\{([^}]*)\}/);
    expect(errorRuleMatch).not.toBeNull();

    const round = buildRound({ initialOrder: ['trex', 'velociraptor', 'triceratops'] });
    ['lista', 'primera-seleccion', 'evaluada'].forEach((targetStatus) => {
      const localContainer = document.createElement('div');
      const result = renderSizeOrderScreen(localContainer, round, {});
      if (targetStatus === 'primera-seleccion') {
        fireEvent.click(result.creatureButtons.trex);
      } else if (targetStatus === 'evaluada') {
        fireEvent.click(result.confirmButton);
      }
      expect(result.getStatus()).toBe(targetStatus);
      expect(result.root.className).toBe('size-order-screen');
    });

    const invalidContainer = document.createElement('div');
    const invalidResult = renderSizeOrderScreen(invalidContainer, buildRound({ initialOrder: ['trex', 'trex'] }), {});
    expect(invalidResult.getStatus()).toBe(STATUS.ERROR_DE_DATOS);
    expect(invalidResult.root.className).toBe('size-order-screen');
  });

  test('creature rows and the confirm button meet the shared 48px minimum tap target', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const creatureRuleMatch = css.match(/\.size-order-screen__creature\s*\{([^}]*)\}/);
    expect(creatureRuleMatch).not.toBeNull();
    expect(creatureRuleMatch[1]).toMatch(/min-height:\s*var\(--tap-target-min\)/);

    const confirmRuleMatch = css.match(/\.size-order-screen__confirm-button\s*\{([^}]*)\}/);
    expect(confirmRuleMatch).not.toBeNull();
    expect(confirmRuleMatch[1]).toMatch(/min-height:\s*var\(--tap-target-min\)/);
    expect(confirmRuleMatch[1]).toMatch(/min-width:\s*var\(--tap-target-min\)/);
  });

  test('accessibility structure: every creature control and the confirm control are real, labeled, reachable buttons in DOM/tab order', () => {
    const round = buildRound({ initialOrder: ['trex', 'velociraptor', 'triceratops'] });
    const { board, confirmButton, nextButton } = renderSizeOrderScreen(container, round);

    const interactive = Array.from(container.querySelectorAll('button'));
    expect(interactive).toHaveLength(5); // 3 creatures + confirm + next (hidden until evaluated)
    interactive.forEach((button) => {
      expect(button.tagName).toBe('BUTTON');
      expect(button.hasAttribute('disabled')).toBe(false);
    });
    expect(interactive[interactive.length - 2]).toBe(confirmButton);
    expect(interactive[interactive.length - 1]).toBe(nextButton);
    expect(nextButton.hidden).toBe(true);
    expect(board.getAttribute('role')).toBe('group');
  });
});
