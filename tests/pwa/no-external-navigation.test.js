'use strict';

/**
 * TRIOFSND-121: the child's closed flow (Inicio -> Quiz -> Resultados) must
 * never offer a way to leave the PWA -- no external `<a>`, no deep links, no
 * `window.open`/`location` escapes reachable from a tap, click or keyboard
 * activation.
 *
 * The three flow screens plus the Privacy view (the ONLY other screen a child
 * can surface by tapping an interactive element inside the flow -- Home's
 * privacy icon) are mounted through their REAL, browser-loaded public
 * interface (`render*Screen` from public/scripts/, which src/screens/*.js
 * re-export) -- never a hand-copied markup fixture, per the acceptance
 * criterion "montan las implementaciones reales ... no una copia ficticia".
 *
 * The screens are imported directly (not via public/scripts/main.js), so the
 * preexisting shared `loadHomeResources` bootstrap defect (TRIOFSND-65/66) is
 * isolated out of this suite without being "fixed" here -- consistent with the
 * story's "aislarse mediante el montaje público soportado" scope note.
 *
 * Two complementary audits:
 *  - STATIC: scan each screen module's source for known escape patterns
 *    (anchor creation, `href`, `window.open`, `target="_blank"`, `location`
 *    navigation, and protocol-relative / external-scheme URL literals).
 *  - RUNTIME: render each screen, install a trustworthy navigation guard that
 *    turns jsdom's silent no-op navigation into observable records (see
 *    tests/pwa/helpers/mountScreen.js), enumerate and activate EVERY
 *    interactive element in every conditional state, and assert the guard
 *    recorded zero external navigations while the required internal
 *    transitions still fire.
 */

require('@testing-library/jest-dom');

const fs = require('fs');
const path = require('path');

const { renderHomeScreen } = require('../../public/scripts/homeScreen');
const { renderQuestionScreen } = require('../../public/scripts/questionScreen');
const { renderResultsScreen } = require('../../public/scripts/resultsScreen');
const { renderPrivacyPolicyScreen } = require('../../public/scripts/privacyPolicyScreen');
const {
  installNavigationGuard,
  activateAllInteractiveElements,
  assertGuardCatchesRealExternalNavigation,
  isExternalDestination,
} = require('./helpers/mountScreen');

const REPO_ROOT = path.resolve(__dirname, '../..');
const CHILD_FLOW_SCREEN_FILES = [
  path.resolve(__dirname, '../../public/scripts/homeScreen.js'),
  path.resolve(__dirname, '../../public/scripts/questionScreen.js'),
  path.resolve(__dirname, '../../public/scripts/resultsScreen.js'),
  path.resolve(__dirname, '../../public/scripts/privacyPolicyScreen.js'),
];

const FORBIDDEN_PATTERNS = [
  {
    name: 'anchor tag creation',
    matches: (src) => src.includes("createElement('a')") || src.includes('createElement("a")'),
  },
  {
    name: 'href attribute or property',
    matches: (src) => src.includes('href'),
  },
  {
    name: 'window.open call',
    matches: (src) => src.includes('window.open') || /(?<!console\.)\.open\(/.test(src),
  },
  {
    name: 'target="_blank"',
    matches: (src) => /target\s*=\s*["']_blank["']/.test(src),
  },
  {
    name: 'location reassignment or navigation call',
    matches: (src) =>
      /(window\.)?location\s*=/.test(src) ||
      src.includes('location.assign') ||
      src.includes('location.replace') ||
      src.includes('location.href'),
  },
  {
    // Security (TRIOFSND-121): a protocol-relative URL such as '//evil.example'
    // is a real escape hatch -- it inherits the current scheme and navigates
    // off the PWA, yet a naive "starts with '/' => internal" check would treat
    // it as safe. Forbid any protocol-relative or external-scheme URL *string
    // literal* in the child-flow screens (a leading quote distinguishes it from
    // a harmless `//` JS comment, so this never false-positives on comments).
    name: 'protocol-relative or external URL literal',
    matches: (src) =>
      /["']\/\//.test(src) ||
      /["']https?:\/\//.test(src) ||
      /["'](?:mailto|tel):/.test(src),
  },
];

function buildQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    dinosaur: 'trex',
    question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
    options: ['Solo de plantas', 'De carne, ¡era un gran cazador!', 'Solo de insectos', 'De algas del mar'],
    correctAnswerIndex: 1,
    funFact: 'El T-Rex tenía la mordida más fuerte de todos los dinosaurios carnívoros conocidos.',
    image: 'dinosaurs/trex.png',
    ...overrides,
  };
}

describe('TRIOFSND-121: closed linear child flow — no external navigation', () => {
  // ---------------------------------------------------------------------------
  // Guard sanity: the classifier and the runtime guard must actually catch real
  // external vectors, so a green suite is evidentiary and not a jsdom no-op.
  // ---------------------------------------------------------------------------
  describe('navigation guard self-test', () => {
    test('classifies protocol-relative and external-scheme URLs as external', () => {
      expect(isExternalDestination('//evil.example/path')).toBe(true);
      expect(isExternalDestination('https://evil.example')).toBe(true);
      expect(isExternalDestination('http://evil.example')).toBe(true);
      expect(isExternalDestination('mailto:a@b.c')).toBe(true);
      expect(isExternalDestination('tel:+34123')).toBe(true);
      expect(isExternalDestination('intent://scan/#Intent;end')).toBe(true);
      expect(isExternalDestination('myapp://open')).toBe(true);
    });

    test('classifies in-PWA destinations as internal', () => {
      expect(isExternalDestination('/quiz')).toBe(false);
      expect(isExternalDestination('#results')).toBe(false);
      expect(isExternalDestination('results')).toBe(false);
      expect(isExternalDestination('')).toBe(false);
      expect(isExternalDestination(null)).toBe(false);
    });

    test('the runtime guard records real anchor/window.open/location escapes', () => {
      const guard = installNavigationGuard(window);
      try {
        assertGuardCatchesRealExternalNavigation(guard, document);
      } finally {
        guard.restore();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Static source audit of every child-flow screen module.
  // ---------------------------------------------------------------------------
  describe('static audit of every child-flow screen module', () => {
    CHILD_FLOW_SCREEN_FILES.forEach((filePath) => {
      const relativePath = path.relative(REPO_ROOT, filePath);
      const source = fs.readFileSync(filePath, 'utf-8');

      FORBIDDEN_PATTERNS.forEach(({ name, matches }) => {
        test(`${relativePath} does not contain: ${name}`, () => {
          expect(matches(source)).toBe(false);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Runtime audit. Each block installs the observable guard, mounts the real
  // screen, drives its public API through every conditional state, and asserts
  // no external navigation while the required internal transitions still fire.
  // ---------------------------------------------------------------------------
  let container;
  let guard;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    guard = installNavigationGuard(window);
  });

  afterEach(() => {
    guard.restore();
    container.remove();
  });

  describe('Home (Inicio)', () => {
    test('renders and activating every interactive element stays inside the PWA', () => {
      renderHomeScreen(container);

      activateAllInteractiveElements(container);

      guard.assertNoExternalNavigation(container);
    });

    test('"¡Jugar!" navigates internally (callback) and never opens an external window/tab', () => {
      const onPlayButtonClick = jest.fn();
      const { playButton } = renderHomeScreen(container, { onPlayButtonClick });

      playButton.click();

      // Internal transition Inicio -> Quiz is a callback into the app router.
      expect(onPlayButtonClick).toHaveBeenCalledTimes(1);
      guard.assertNoExternalNavigation(container);
    });

    test('toggling mute only flips audio state — no navigation', () => {
      const onToggleMute = jest.fn();
      const { muteButton } = renderHomeScreen(container, { onToggleMute });

      muteButton.click();
      muteButton.click();

      expect(onToggleMute).toHaveBeenNthCalledWith(1, true);
      expect(onToggleMute).toHaveBeenNthCalledWith(2, false);
      guard.assertNoExternalNavigation(container);
    });

    test('privacy disclosure opens an internal panel in one tap (≤2 taps) with no external URL', () => {
      const { privacyButton, privacyPanel } = renderHomeScreen(container);

      expect(privacyPanel.hidden).toBe(true);
      privacyButton.click();
      // Opened in a single tap -> well within the ≤2-tap requirement.
      expect(privacyPanel.hidden).toBe(false);
      expect(privacyButton.getAttribute('aria-expanded')).toBe('true');

      activateAllInteractiveElements(privacyPanel);
      guard.assertNoExternalNavigation(container);
    });

    test('the full-screen privacy policy button only calls back into the app', () => {
      const onOpenPrivacyPolicy = jest.fn();
      const { privacyPolicyButton } = renderHomeScreen(container, { onOpenPrivacyPolicy });

      privacyPolicyButton.click();

      expect(onOpenPrivacyPolicy).toHaveBeenCalledTimes(1);
      guard.assertNoExternalNavigation(container);
    });

    test('purchase disclosure opens the internal flow only — no store/payment link or external scheme', () => {
      const onPurchase = jest.fn();
      const { purchaseButton, purchasePanel } = renderHomeScreen(container, { onPurchase });

      purchaseButton.click();
      expect(purchasePanel.hidden).toBe(false);

      const confirmButton = purchasePanel.querySelector('.home-screen__purchase-confirm-button');
      confirmButton.click();

      // Purchase entry hands off to the app's internal purchase flow, never a
      // direct external store/web-payment navigation.
      expect(onPurchase).toHaveBeenCalledTimes(1);
      guard.assertNoExternalNavigation(container);
    });

    test('first-run tooltip: showing and dismissing on the first tap stays inside the PWA', () => {
      const onTooltipDismiss = jest.fn();
      const { playButton, tooltip } = renderHomeScreen(container, { showTooltip: true, onTooltipDismiss });

      expect(tooltip).not.toBeNull();
      guard.assertNoExternalNavigation(container);

      // The tooltip dismisses on the first tap anywhere — exercise that gesture.
      playButton.click();

      expect(onTooltipDismiss).toHaveBeenCalledTimes(1);
      guard.assertNoExternalNavigation(container);
    });

    test('closing an opened disclosure panel stays inside the PWA', () => {
      const { privacyButton, privacyPanel } = renderHomeScreen(container);

      privacyButton.click();
      const closeButton = privacyPanel.querySelector('.home-screen__panel-close-button');
      closeButton.click();

      expect(privacyPanel.hidden).toBe(true);
      guard.assertNoExternalNavigation(container);
    });
  });

  describe('Quiz (Pregunta)', () => {
    test('renders and activating every interactive element stays inside the PWA', () => {
      renderQuestionScreen(container, buildQuestion());

      activateAllInteractiveElements(container);

      guard.assertNoExternalNavigation(container);
    });

    test('a wrong pick reveals feedback without any external navigation', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, index) => index !== question.correctAnswerIndex);
      const { optionButtons } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      guard.assertNoExternalNavigation(container);
    });

    test('answering all 10 questions transitions Quiz -> Resultados internally only', () => {
      // Drive the full 10-question run through the real screen: each "Siguiente"
      // is an internal callback, and only the 10th advances to Resultados.
      let advances = 0;
      for (let i = 0; i < 10; i += 1) {
        container.innerHTML = '';
        const question = buildQuestion({ id: `q-${i}` });
        const { optionButtons, nextButton } = renderQuestionScreen(container, question, {
          onNext: () => {
            advances += 1;
          },
        });

        // Before answering there is no "Siguiente" to leave the screen.
        expect(nextButton.hidden).toBe(true);
        optionButtons[question.correctAnswerIndex].click();
        expect(nextButton.hidden).toBe(false);

        nextButton.click();
        guard.assertNoExternalNavigation(container);
      }

      expect(advances).toBe(10);
    });
  });

  describe('Resultados', () => {
    test('no-purchase state: renders, exposes no third-party ad/banner surface, activation stays internal', () => {
      // For a user without purchase, any banner / rewarded-ad representation
      // must be inert toward third parties: no anchors, no external hrefs, no
      // navigable blank targets anywhere in the results DOM.
      renderResultsScreen(container, { score: 5 });

      // Whatever ad-surface the parent story may render, none of it is a
      // navigable external element.
      expect(container.querySelectorAll('a')).toHaveLength(0);
      expect(container.querySelectorAll('[href]')).toHaveLength(0);
      expect(container.querySelectorAll('[target="_blank"]')).toHaveLength(0);

      activateAllInteractiveElements(container);
      guard.assertNoExternalNavigation(container);
    });

    test('purchased state: no ad or external surface introduced', () => {
      renderResultsScreen(container, { score: 9, purchased: true });

      activateAllInteractiveElements(container);
      guard.assertNoExternalNavigation(container);
    });

    test('"Volver a jugar" starts a new game internally, no external window/tab', () => {
      const onPlayAgain = jest.fn();
      const { playAgainButton } = renderResultsScreen(container, { score: 7, onPlayAgain });

      playAgainButton.click();

      expect(onPlayAgain).toHaveBeenCalledTimes(1);
      guard.assertNoExternalNavigation(container);
    });

    test('optional "Salir" returns to internal Inicio only', () => {
      const onExit = jest.fn();
      const { exitButton } = renderResultsScreen(container, { score: 7, onExit });

      exitButton.click();

      expect(onExit).toHaveBeenCalledTimes(1);
      guard.assertNoExternalNavigation(container);
    });

    test('skipping the (optional) rewarded ad never blocks "Volver a jugar"', () => {
      // No rewarded-ad control is a precondition for replay: the play-again
      // button is present and functional without any ad interaction.
      const onPlayAgain = jest.fn();
      const { playAgainButton } = renderResultsScreen(container, { score: 3, onPlayAgain });

      expect(playAgainButton).toBeTruthy();
      playAgainButton.click();

      expect(onPlayAgain).toHaveBeenCalledTimes(1);
      guard.assertNoExternalNavigation(container);
    });
  });

  describe('Política de privacidad (reachable from Home)', () => {
    test('renders and activating every interactive element stays inside the PWA', () => {
      renderPrivacyPolicyScreen(container);

      activateAllInteractiveElements(container);

      guard.assertNoExternalNavigation(container);
    });

    test('"Volver" only calls back into the app, never a real navigation', () => {
      const onBack = jest.fn();
      const { backButton } = renderPrivacyPolicyScreen(container, { onBack });

      backButton.click();

      expect(onBack).toHaveBeenCalledTimes(1);
      guard.assertNoExternalNavigation(container);
    });
  });
});
