'use strict';

require('@testing-library/jest-dom');
const { getByRole, getAllByRole } = require('@testing-library/dom');

const { renderModeSelectorScreen } = require('./ModeSelectorScreen');
const { MODES_CATALOG, MODE_IDS, AVAILABILITY_CAUSES } = require('../game/modesCatalog');
const { modeSelector: strings, modes: modesStrings } = require('../../public/i18n/es.json');

// A deterministic mix covering every AVAILABILITY_CAUSES value, independent
// of the real shipped question/creature bank so this suite doesn't drift
// when content is added (see src/game/modesCatalog.test.js for that coverage).
const AVAILABILITY_FIXTURE = [
  { modeId: MODE_IDS.QUIZ, available: true, cause: null, details: null },
  { modeId: MODE_IDS.LABERINTO, available: true, cause: null, details: null },
  {
    modeId: MODE_IDS.SOMBRA,
    available: false,
    cause: AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES,
    details: { need: 12, have: 7 },
  },
  {
    modeId: MODE_IDS.OIDO_JURASICO,
    available: false,
    cause: AVAILABILITY_CAUSES.INSUFFICIENT_CREATURE_SOUNDS,
    details: { need: 8, have: 0 },
  },
  {
    modeId: MODE_IDS.PAREJAS,
    available: false,
    cause: AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES,
    details: { need: 8, have: 7 },
  },
  {
    modeId: MODE_IDS.CLASIFICA,
    available: false,
    cause: AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD,
    details: { field: 'diet', need: 6, have: 0 },
  },
  {
    modeId: MODE_IDS.ORDENA_POR_TAMANO,
    available: false,
    cause: AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD,
    details: { field: 'size', need: 4, have: 0 },
  },
  {
    modeId: MODE_IDS.LINEA_DEL_TIEMPO,
    available: false,
    cause: AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD,
    details: { field: 'era', need: 4, have: 0 },
  },
];

function createLastModeServiceStub(lastMode) {
  return {
    getLastMode: jest.fn(() => lastMode || null),
    setLastMode: jest.fn(),
  };
}

function createLogServiceStub() {
  return {
    logSelectorOpen: jest.fn(),
    logModeBlocked: jest.fn(),
  };
}

function renderWithFixture(container, overrides) {
  return renderModeSelectorScreen(
    container,
    Object.assign(
      {
        strings,
        modesStrings,
        modes: MODES_CATALOG,
        availability: AVAILABILITY_FIXTURE,
        lastModeService: createLastModeServiceStub(),
        logService: createLogServiceStub(),
      },
      overrides
    )
  );
}

describe('ModeSelectorScreen rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not hardcode copy — title and back button come from the es locale resource file', () => {
    renderWithFixture(container);

    expect(getByRole(container, 'heading', { name: strings.screenTitle })).toBeInTheDocument();
    expect(getByRole(container, 'button', { name: strings.backButtonLabel })).toBeInTheDocument();
  });

  test('renders exactly eight cards, one per MODES_CATALOG entry, without horizontal scroll wrappers', () => {
    const { grid } = renderWithFixture(container);

    expect(grid.tagName).toBe('UL');
    expect(grid).toHaveClass('mode-selector-screen__grid');
    expect(container.querySelectorAll('.mode-selector-screen__card')).toHaveLength(8);
    expect(getAllByRole(container, 'button').length).toBe(9); // 8 cards + back button
  });

  test('renders without throwing (no ReferenceError from an undefined `doc`) and creates exactly eight cards', () => {
    let result;

    expect(() => {
      result = renderWithFixture(container);
    }).not.toThrow();

    expect(container.querySelectorAll('.mode-selector-screen__card')).toHaveLength(8);
    expect(Object.keys(result.cards)).toHaveLength(8);
  });

  test('derives its document from the container instead of relying on an ambient global `doc`/`document`', () => {
    // A container that belongs to a *different* document than the global
    // one Jest's jsdom environment installs. If any element-creation helper
    // fell back to a free/global `document` (or an undefined `doc`) instead
    // of the render context's own document, the created nodes would belong
    // to the wrong document (or the call would throw).
    const foreignDocument = document.implementation.createHTMLDocument('mode-selector');
    const foreignContainer = foreignDocument.createElement('div');
    foreignDocument.body.appendChild(foreignContainer);

    const { root, cards } = renderWithFixture(foreignContainer);

    expect(root.ownerDocument).toBe(foreignDocument);
    expect(Object.keys(cards)).toHaveLength(8);
    Object.values(cards).forEach((card) => {
      expect(card.ownerDocument).toBe(foreignDocument);
    });
  });

  test('re-rendering into the same container clears the previous render', () => {
    renderWithFixture(container);
    renderWithFixture(container);

    expect(container.querySelectorAll('.mode-selector-screen').length).toBe(1);
    expect(container.querySelectorAll('.mode-selector-screen__card').length).toBe(8);
  });

  test('each card shows its localized name from modes.<id>.name and an illustration hidden from assistive tech', () => {
    renderWithFixture(container);

    MODES_CATALOG.forEach((mode) => {
      expect(container.textContent).toContain(modesStrings[mode.id].name);
    });
    container.querySelectorAll('.mode-selector-screen__card-illustration').forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('ModeSelectorScreen availability wiring', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('an available card is a real, non-disabled button and shows the "Disponible" status text', () => {
    const { cards } = renderWithFixture(container);
    const quizCard = cards[MODE_IDS.QUIZ];

    expect(quizCard.tagName).toBe('BUTTON');
    expect(quizCard).not.toBeDisabled();
    expect(quizCard).not.toHaveAttribute('aria-disabled');
    expect(quizCard.textContent).toContain(strings.status.available);
  });

  test('a blocked card stays focusable/reachable (never a native disabled button) and exposes its reason as visible text', () => {
    const { cards } = renderWithFixture(container);
    const sombraCard = cards[MODE_IDS.SOMBRA];

    expect(sombraCard.tagName).toBe('BUTTON');
    expect(sombraCard).not.toBeDisabled();
    expect(sombraCard).toHaveAttribute('aria-disabled', 'true');
    expect(sombraCard.textContent).toContain(strings.status.blocked);
    expect(sombraCard.textContent).toContain(strings.blockedReasons[AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES]);
  });

  test('every AVAILABILITY_CAUSES cause resolves to real, distinct reason copy exposed via aria-describedby', () => {
    const { cards } = renderWithFixture(container);

    AVAILABILITY_FIXTURE.filter((verdict) => !verdict.available).forEach((verdict) => {
      const card = cards[verdict.modeId];
      const describedById = card.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();
      const description = document.getElementById(describedById);
      expect(description.textContent).toContain(strings.blockedReasons[verdict.cause]);
    });
  });

  test('tapping an available card persists it as the last mode and calls onSelectMode', () => {
    const lastModeService = createLastModeServiceStub();
    const onSelectMode = jest.fn();
    const { cards } = renderWithFixture(container, { lastModeService, onSelectMode });

    cards[MODE_IDS.LABERINTO].click();

    expect(lastModeService.setLastMode).toHaveBeenCalledWith(MODE_IDS.LABERINTO);
    expect(onSelectMode).toHaveBeenCalledWith(MODE_IDS.LABERINTO);
  });

  test('tapping a blocked card never persists it, never calls onSelectMode, and logs the blocked attempt locally', () => {
    const lastModeService = createLastModeServiceStub();
    const logService = createLogServiceStub();
    const onSelectMode = jest.fn();
    const onBlockedModeAttempt = jest.fn();
    const { cards } = renderWithFixture(container, {
      lastModeService,
      logService,
      onSelectMode,
      onBlockedModeAttempt,
    });

    cards[MODE_IDS.CLASIFICA].click();

    expect(lastModeService.setLastMode).not.toHaveBeenCalled();
    expect(onSelectMode).not.toHaveBeenCalled();
    expect(logService.logModeBlocked).toHaveBeenCalledWith(
      MODE_IDS.CLASIFICA,
      AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD
    );
    expect(onBlockedModeAttempt).toHaveBeenCalledWith(MODE_IDS.CLASIFICA, AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD);
  });

  test('logs a selector-open diagnostic once per render', () => {
    const logService = createLogServiceStub();
    renderWithFixture(container, { logService });

    expect(logService.logSelectorOpen).toHaveBeenCalledTimes(1);
  });
});

describe('ModeSelectorScreen last-used mode marking', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('the last-played mode is marked with aria-current and a visible badge, without disabling any other card', () => {
    const lastModeService = createLastModeServiceStub(MODE_IDS.QUIZ);
    const { cards } = renderWithFixture(container, { lastModeService });

    expect(cards[MODE_IDS.QUIZ]).toHaveAttribute('aria-current', 'true');
    expect(cards[MODE_IDS.QUIZ].textContent).toContain(strings.lastPlayedBadge);

    MODES_CATALOG.filter((mode) => mode.id !== MODE_IDS.QUIZ).forEach((mode) => {
      expect(cards[mode.id]).not.toHaveAttribute('aria-current');
      expect(cards[mode.id].hasAttribute('disabled')).toBe(false);
    });
  });

  test('no last-played mode recorded yet: no card is marked, every card stays interactive', () => {
    const lastModeService = createLastModeServiceStub(null);
    const { cards } = renderWithFixture(container, { lastModeService });

    MODES_CATALOG.forEach((mode) => {
      expect(cards[mode.id]).not.toHaveAttribute('aria-current');
    });
  });

  test('selecting a new available mode moves the last-used marker to it immediately', () => {
    const lastModeService = createLastModeServiceStub(MODE_IDS.QUIZ);
    const { cards } = renderWithFixture(container, { lastModeService });

    cards[MODE_IDS.LABERINTO].click();

    expect(cards[MODE_IDS.LABERINTO]).toHaveAttribute('aria-current', 'true');
    expect(cards[MODE_IDS.QUIZ]).not.toHaveAttribute('aria-current');
  });
});

describe('ModeSelectorScreen accessibility (roles/labels, focus, keyboard)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('the title is a heading and receives focus on mount so screen readers announce the new screen', () => {
    const { title } = renderWithFixture(container);

    expect(getByRole(container, 'heading', { name: strings.screenTitle })).toBe(title);
    expect(title).toHaveFocus();
    expect(title).toHaveAttribute('tabindex', '-1');
  });

  test('each card exposes its accessible label (distinct from its visible name) as the button accessible name', () => {
    const { cards } = renderWithFixture(container);

    MODES_CATALOG.forEach((mode) => {
      const accessibleLabel = strings.modes[mode.id].accessibleLabel;
      expect(cards[mode.id]).toHaveAccessibleName(accessibleLabel);
      expect(accessibleLabel).not.toBe(modesStrings[mode.id].name);
    });
  });

  test('the Oído Jurásico accessible label presents its sounds as imagined, not scientific fact', () => {
    const { cards } = renderWithFixture(container);
    expect(cards[MODE_IDS.OIDO_JURASICO]).toHaveAccessibleName(/imaginado/i);
  });

  test('every card meets the >=48x48dp minimum touch target class contract', () => {
    const { cards } = renderWithFixture(container);

    Object.values(cards).forEach((card) => {
      expect(card).toHaveClass('mode-selector-screen__card');
    });
  });

  test('activating a card via a native click (keyboard Enter/Space triggers the same click event) selects it', () => {
    const onSelectMode = jest.fn();
    const { cards } = renderWithFixture(container, { onSelectMode });

    // <button> elements fire a click event for both Enter and Space natively;
    // this asserts the handler is wired to that event rather than a
    // pointer-only listener (e.g. mousedown), which would exclude keyboard use.
    cards[MODE_IDS.QUIZ].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onSelectMode).toHaveBeenCalledWith(MODE_IDS.QUIZ);
  });

  test('back button tap calls onBack', () => {
    const onBack = jest.fn();
    const { backButton } = renderWithFixture(container, { onBack });

    backButton.click();

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
