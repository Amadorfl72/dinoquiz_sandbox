'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { fireEvent } = require('@testing-library/dom');

const { renderShadowGuessScreen } = require('./ShadowGuessScreen');
const { shadowGuess: strings } = require('../../public/i18n/es.json');
const { generateShadowRound, ERRORS } = require('../game/shadowGuessRound');
const { createRandom } = require('../game/mazeGenerator');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

function buildRound(overrides = {}) {
  return {
    roundIndex: 0,
    level: 3,
    correctId: 'trex',
    options: ['trex', 'triceratops', 'velociraptor', 'estegosaurio'],
    transform: null,
    status: 'playing',
    ...overrides,
  };
}

describe('ShadowGuessScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the title, instructions, round/level progress and score from the real es.json strings', () => {
    const round = buildRound();
    renderShadowGuessScreen(container, round, { roundNumber: 2, totalRounds: 10, score: 3 });

    expect(container.textContent).toContain(strings.name);
    expect(container.textContent).toContain(strings.instructions);
    expect(container.textContent).toContain('Ronda 2 de 10');
    expect(container.textContent).toContain('Nivel 3');
    expect(container.textContent).toContain(strings.scoreLabel + ': 3');
  });

  test('renders the silhouette as a decorative, aria-hidden image reusing the existing dinosaur illustration', () => {
    const round = buildRound();
    const { silhouetteImage } = renderShadowGuessScreen(container, round);

    expect(silhouetteImage.src).toContain('/assets/images/dinosaurs/trex.svg');
    expect(silhouetteImage.alt).toBe('');
    expect(silhouetteImage.getAttribute('aria-hidden')).toBe('true');
    expect(silhouetteImage.className).toContain('shadow-guess-screen__silhouette-image');
  });

  test('applies a CSS modifier class for a mirrored/rotated silhouette, and none for identity', () => {
    const flipped = renderShadowGuessScreen(container, buildRound({ transform: 'flipHorizontal' }));
    expect(flipped.silhouetteImage.className).toContain('shadow-guess-screen__silhouette-image--flip');

    const otherContainer = document.createElement('div');
    const identity = renderShadowGuessScreen(otherContainer, buildRound({ transform: null }));
    expect(identity.silhouetteImage.className).toBe('shadow-guess-screen__silhouette-image');
  });

  test('renders four accessible options: labeled group, visible creature name, position-numbered aria-label', () => {
    const round = buildRound();
    const { optionsGroup, optionButtons } = renderShadowGuessScreen(container, round);

    expect(optionsGroup).toHaveAttribute('role', 'group');
    expect(optionsGroup).toHaveAttribute('aria-label', strings.optionsGroupLabel);
    expect(optionButtons).toHaveLength(4);

    optionButtons.forEach((button, index) => {
      const creature = strings.dinosaurNames[round.options[index]];
      expect(button.textContent).toBe(creature);
      expect(button.getAttribute('aria-label')).toBe(
        strings.options['option' + (index + 1) + 'Label'].replace('{creature}', creature)
      );
      expect(button.tagName).toBe('BUTTON');
    });
  });

  test('a correct pick scores once, marks the option correct, and announces text (not just color)', () => {
    const round = buildRound();
    const onAnswer = jest.fn();
    const { optionButtons, announcementEl, scoreEl } = renderShadowGuessScreen(container, round, { score: 2, onAnswer });

    fireEvent.click(optionButtons[0]); // trex, correct

    expect(optionButtons[0]).toHaveClass('shadow-guess-screen__option--correct');
    expect(optionButtons.every((button) => button.disabled)).toBe(true);
    expect(scoreEl.textContent).toBe(strings.scoreLabel + ': 3');
    expect(announcementEl.textContent).toContain(strings.feedback.correct);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: true, score: 3, scoreDelta: 1, correctId: 'trex', selectedId: 'trex' })
    );
  });

  test('a wrong pick never subtracts, marks the correct option and the tapped one distinctly, and spells out the right creature', () => {
    const round = buildRound();
    const { optionButtons, announcementEl, scoreEl } = renderShadowGuessScreen(container, round, { score: 5 });

    fireEvent.click(optionButtons[1]); // triceratops, wrong

    expect(scoreEl.textContent).toBe(strings.scoreLabel + ': 5');
    expect(optionButtons[0]).toHaveClass('shadow-guess-screen__option--correct'); // trex, the real answer
    expect(optionButtons[0].getAttribute('aria-label')).toBe(
      strings.correctOptionAriaLabelFormat.replace('{creature}', strings.dinosaurNames.trex)
    );
    expect(optionButtons[1]).toHaveClass('shadow-guess-screen__option--neutral');
    expect(optionButtons[1].getAttribute('aria-label')).toBe(
      strings.selectedOptionAriaLabelFormat.replace('{creature}', strings.dinosaurNames.triceratops)
    );

    const expectedAnswer = strings.feedback.correctAnswer.replace('{creature}', strings.dinosaurNames.trex);
    expect(announcementEl.textContent).toContain(strings.feedback.incorrect);
    expect(announcementEl.textContent).toContain(expectedAnswer);
  });

  test('counts a response only once: a second click on any option after the first is ignored', () => {
    const round = buildRound();
    const onAnswer = jest.fn();
    const { optionButtons } = renderShadowGuessScreen(container, round, { score: 0, onAnswer });

    fireEvent.click(optionButtons[0]);
    fireEvent.click(optionButtons[1]);
    fireEvent.click(optionButtons[0]);

    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  test('shows the accessible feedback component (icon + text) on answer', () => {
    const round = buildRound();
    const { feedbackComponent, optionButtons } = renderShadowGuessScreen(container, round);
    expect(feedbackComponent.root.hidden).toBe(true);

    fireEvent.click(optionButtons[0]);

    const icon = container.querySelector('.feedback-component__icon');
    const message = container.querySelector('.feedback-component__message');
    expect(feedbackComponent.root.hidden).toBe(false);
    expect(icon.textContent.length).toBeGreaterThan(0);
    expect(message.textContent).toBe(strings.feedback.correct);
  });

  test('reveals "Siguiente" only after answering, and it forwards the updated score via onNext', () => {
    const round = buildRound();
    const onNext = jest.fn();
    const { optionButtons, nextButton } = renderShadowGuessScreen(container, round, { score: 0, onNext });

    expect(nextButton.hidden).toBe(true);
    fireEvent.click(optionButtons[0]);
    expect(nextButton.hidden).toBe(false);

    fireEvent.click(nextButton);
    expect(onNext).toHaveBeenCalledWith(1);
  });

  test('renders the localized blocked state instead of a puzzle when the round is a catalog-too-small error', () => {
    const round = { error: ERRORS.CATALOG_TOO_SMALL, details: { need: 12, have: 5 } };
    const result = renderShadowGuessScreen(container, round);

    expect(result.isBlocked()).toBe(true);
    expect(container.textContent).toContain(strings.name);
    expect(container.querySelector('.shadow-guess-screen__blocked-message')).toHaveTextContent(
      strings.blocked.insufficientCatalog
    );
    expect(container.querySelector('.shadow-guess-screen__blocked-message')).toHaveAttribute('role', 'status');
    expect(container.querySelector('.shadow-guess-screen__option')).toBeNull();
  });

  test('renders a well-formed round produced by shadowGuessRound.js end to end', () => {
    const random = createRandom('shadow-guess-screen-integration');
    const round = generateShadowRound({ roundIndex: 0, level: 5, randomFn: random });

    const { optionButtons } = renderShadowGuessScreen(container, round);
    expect(optionButtons).toHaveLength(4);
    fireEvent.click(optionButtons[round.options.indexOf(round.correctId)]);
    expect(optionButtons[round.options.indexOf(round.correctId)]).toHaveClass('shadow-guess-screen__option--correct');
  });

  test('the options grid stays within the shared 375px-safe layout used by question-screen', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const optionsRuleMatch = css.match(/\.shadow-guess-screen__options\s*\{([^}]*)\}/);
    expect(optionsRuleMatch).not.toBeNull();
    expect(optionsRuleMatch[1]).toMatch(/grid-template-columns:\s*repeat\(2,/);

    const frameRuleMatch = css.match(/\.shadow-guess-screen__silhouette-frame\s*\{([^}]*)\}/);
    expect(frameRuleMatch).not.toBeNull();
    expect(frameRuleMatch[1]).toMatch(/width:\s*min\(100%,\s*260px\)/);
  });

  test('every option button meets the shared 48px minimum tap target', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const optionRuleMatch = css.match(/\.shadow-guess-screen__option\s*\{([^}]*)\}/);
    expect(optionRuleMatch).not.toBeNull();
    expect(optionRuleMatch[1]).toMatch(/min-width:\s*var\(--tap-target-min\)/);
  });
});
