'use strict';

require('@testing-library/jest-dom');

/**
 * TRIOFSND-310: audits Inicio/Pregunta/Resultados for keyboard operability —
 * every interactive control must be reachable with Tab in a logical
 * (top-to-bottom, left-to-right) order and activatable with Enter/Espacio.
 *
 * The three screens under audit render native `<button>` elements for every
 * action (see public/scripts/homeScreen.js, questionScreen.js,
 * resultsScreen.js), so Tab-reachability is already native browser
 * behaviour — nothing here adds tabindex to the screens themselves. Every
 * control's Enter/Espacio activation, however, is real, explicit JS: each
 * button is wired via that file's local `bindActivation` helper, which
 * attaches a `keydown` listener (Enter/Espacio -> `preventDefault` + call
 * the same handler `click` uses) alongside the `click` listener, instead of
 * leaning on the browser's own default action for keyboard activation. That
 * makes the behaviour something this suite can actually exercise: `pressTabTo`
 * walks the already-asserted focusable-element order one control at a time
 * via `.focus()`, dispatching the real `keydown` for Tab at each step, and
 * `pressActivationKey` dispatches only a `keydown` for Enter/Espacio at the
 * target control — no `.click()` call anywhere in this file — so a passing
 * assertion is proof the control's own keydown handling produced the effect,
 * not a stand-in for it.
 */

const { renderHomeScreen } = require('../../public/scripts/homeScreen');
const { renderQuestionScreen } = require('../../public/scripts/questionScreen');
const { renderResultsScreen } = require('../../public/scripts/resultsScreen');
const i18n = require('../../src/i18n');

const strings = i18n.getStrings(i18n.DEFAULT_LOCALE);
const TOTAL_QUESTIONS = 10;

function buildQuestions(count) {
  return Array.from({ length: count }, (_unused, index) => ({
    id: 'kbd-nav-' + index,
    dinosaur: 'trex',
    question: 'Pregunta de prueba número ' + (index + 1),
    options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
    correctAnswerIndex: index % 4,
    funFact: 'Un dato curioso de prueba.',
    image: 'dinosaurs/trex.png',
  }));
}

function isUnderHiddenAncestor(element) {
  for (let node = element; node; node = node.parentElement) {
    if (node.hidden) return true;
  }
  return false;
}

/** The set of elements a keyboard user can Tab to, in document order — mirrors the browser's native tab-order rules (skip disabled controls and anything under a `hidden` ancestor). */
function getTabOrder(root) {
  return Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]')).filter((el) => {
    if (el.disabled) return false;
    if (isUnderHiddenAncestor(el)) return false;
    const tabIndexAttr = el.getAttribute('tabindex');
    return tabIndexAttr === null || Number(tabIndexAttr) >= 0;
  });
}

/** Steps Tab forward, one control at a time, from whatever currently has focus up to `target`, asserting each intermediate control is actually visited in order. */
function pressTabTo(target, tabOrder) {
  const targetIndex = tabOrder.indexOf(target);
  expect(targetIndex).toBeGreaterThanOrEqual(0);
  const startIndex = tabOrder.indexOf(document.activeElement);

  for (let i = startIndex + 1; i <= targetIndex; i += 1) {
    const from = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
    from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    tabOrder[i].focus();
    expect(tabOrder[i]).toHaveFocus();
  }
}

/**
 * Dispatches only a `keydown` for Enter/Espacio at `element` — no `.click()`
 * call. Every control under audit wires its own Enter/Espacio handling via
 * `bindActivation` (see homeScreen.js/questionScreen.js/resultsScreen.js),
 * so this purely exercises that keydown handler; it never falls back to a
 * synthetic click.
 */
function pressActivationKey(element, key) {
  const event = new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

describe('TRIOFSND-310: keyboard-only navigation through a full quiz session (Inicio -> 10 preguntas -> Resultados)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('every control is Tab-reachable in reading order and operable with Enter/Espacio alone', () => {
    jest.useFakeTimers();
    try {
      const questions = buildQuestions(TOTAL_QUESTIONS);

      // -- Inicio ----------------------------------------------------------
      const homeApi = renderHomeScreen(container, {
        strings: strings.home,
        privacyStrings: strings.privacy,
        purchaseStrings: strings.purchase,
      });

      const homeTabOrder = getTabOrder(container);
      // Reading order: play button, then the privacy-policy icon, then the
      // global controls row (mute / privacy / purchase) below it.
      expect(homeTabOrder).toEqual([
        homeApi.playButton,
        homeApi.privacyPolicyButton,
        homeApi.muteButton,
        homeApi.privacyButton,
        homeApi.purchaseButton,
      ]);
      // The disclosure panels are closed on mount, so their controls (close
      // buttons, purchase confirm) aren't in the tab order yet.
      expect(homeTabOrder).not.toContain(homeApi.purchaseConfirmButton);

      pressTabTo(homeApi.playButton, homeTabOrder);
      pressActivationKey(homeApi.playButton, 'Enter');

      // -- Quiz: 10 preguntas ------------------------------------------------
      let score = 0;
      for (let index = 0; index < TOTAL_QUESTIONS; index += 1) {
        const question = questions[index];
        let onNextScore = null;

        const questionApi = renderQuestionScreen(container, question, {
          strings: strings.question,
          score: score,
          questionNumber: index + 1,
          totalQuestions: TOTAL_QUESTIONS,
          onNext: function (finalScore) {
            onNextScore = finalScore;
          },
        });

        const tabOrderBeforeAnswer = getTabOrder(container);
        // Reading order: the 4 options (2-column grid, row-major), nothing
        // else — "Siguiente" and the ad CTA are still [hidden].
        expect(tabOrderBeforeAnswer).toEqual(questionApi.optionButtons);

        const targetOption = questionApi.optionButtons[question.correctAnswerIndex];
        pressTabTo(targetOption, tabOrderBeforeAnswer);
        // Alternate Enter/Space across questions to exercise both keys.
        pressActivationKey(targetOption, index % 2 === 0 ? ' ' : 'Enter');
        score += 1;

        expect(questionApi.scoreEl.textContent).toContain(String(score));

        const tabOrderAfterAnswer = getTabOrder(container);
        // Every option is now disabled (excluded from the tab order);
        // "Siguiente" is the only reachable control left.
        expect(tabOrderAfterAnswer).toEqual([questionApi.nextButton]);

        pressTabTo(questionApi.nextButton, tabOrderAfterAnswer);
        pressActivationKey(questionApi.nextButton, index % 2 === 0 ? 'Enter' : ' ');

        expect(onNextScore).toBe(score);
      }

      expect(score).toBe(TOTAL_QUESTIONS);

      // -- Resultados --------------------------------------------------------
      let playAgainActivated = false;
      const resultsApi = renderResultsScreen(container, {
        strings: strings.results,
        score: score,
        randomFn: function () {
          return 0;
        },
        onPlayAgain: function () {
          playAgainActivated = true;
        },
      });

      const resultsTabOrder = getTabOrder(container);
      // Reading order: primary action, secondary action, then the ads row.
      expect(resultsTabOrder).toEqual([resultsApi.playAgainButton, resultsApi.exitButton, resultsApi.rewardedAdButton]);

      pressTabTo(resultsApi.playAgainButton, resultsTabOrder);
      pressActivationKey(resultsApi.playAgainButton, 'Enter');

      expect(playAgainActivated).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('TRIOFSND-310: home screen global controls (mute / privacy / purchase) are each keyboard-reachable and operable', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('Espacio toggles mute without a pointer', () => {
    const homeApi = renderHomeScreen(container, {
      strings: strings.home,
      privacyStrings: strings.privacy,
      purchaseStrings: strings.purchase,
    });

    expect(homeApi.muteButton.getAttribute('aria-pressed')).toBe('false');

    const tabOrder = getTabOrder(container);
    pressTabTo(homeApi.muteButton, tabOrder);
    pressActivationKey(homeApi.muteButton, ' ');

    expect(homeApi.muteButton.getAttribute('aria-pressed')).toBe('true');
  });

  test('Enter opens the privacy disclosure panel and moves its close button into the tab order', () => {
    const homeApi = renderHomeScreen(container, {
      strings: strings.home,
      privacyStrings: strings.privacy,
      purchaseStrings: strings.purchase,
    });

    const tabOrder = getTabOrder(container);
    pressTabTo(homeApi.privacyButton, tabOrder);
    pressActivationKey(homeApi.privacyButton, 'Enter');

    expect(homeApi.privacyPanel.hidden).toBe(false);
    expect(getTabOrder(container)).toContain(homeApi.privacyPanel.querySelector('.home-screen__panel-close-button'));
  });
});

describe('TRIOFSND-310: results screen secondary controls (Salir / ver anuncio) are each keyboard-reachable and operable', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('Espacio activates "Salir"', () => {
    let exitActivated = false;
    const resultsApi = renderResultsScreen(container, {
      strings: strings.results,
      score: 5,
      randomFn: function () {
        return 0;
      },
      onExit: function () {
        exitActivated = true;
      },
    });

    const tabOrder = getTabOrder(container);
    pressTabTo(resultsApi.exitButton, tabOrder);
    pressActivationKey(resultsApi.exitButton, ' ');

    expect(exitActivated).toBe(true);
  });

  test('Enter activates the rewarded-ad button', () => {
    let rewardedAdActivated = false;
    const resultsApi = renderResultsScreen(container, {
      strings: strings.results,
      score: 5,
      randomFn: function () {
        return 0;
      },
      onWatchRewardedAd: function () {
        rewardedAdActivated = true;
      },
    });

    const tabOrder = getTabOrder(container);
    pressTabTo(resultsApi.rewardedAdButton, tabOrder);
    pressActivationKey(resultsApi.rewardedAdButton, 'Enter');

    expect(rewardedAdActivated).toBe(true);
  });
});
