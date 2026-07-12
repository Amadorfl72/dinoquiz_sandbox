'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getAllByRole, getByText } = require('@testing-library/dom');

const { renderQuestionScreen, MIN_ADVANCE_DELAY_MS, validateFeedbackCopy } = require('./QuestionScreen');
const { question: strings } = require('../../public/i18n/es.json');
const { loadQuestionBank, resolveDatoCurioso } = require('../data/questionBank');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

// Design tokens (TRIOFSND-133) moved these values into `:root` custom
// properties, so a rule's literal px/rem values must be resolved through
// `var(--token)` before pattern-matching them here.
function resolveCssCustomProperties(css, ruleText) {
  const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
  const tokens = {};
  Array.from((rootMatch ? rootMatch[1] : '').matchAll(/--([\w-]+):\s*([^;]+);/g)).forEach((match) => {
    tokens[match[1]] = match[2].trim();
  });
  return ruleText.replace(/var\(--([\w-]+)\)/g, (fullMatch, name) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? tokens[name] : fullMatch
  );
}

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

describe('content-guide validation of failure feedback copy (TRIOFSND-91)', () => {
  test('the real es.json question strings contain no negative language', () => {
    expect(validateFeedbackCopy(strings)).toEqual([]);
  });

  test('flags a feedback.incorrect string containing banned negative language', () => {
    const errors = validateFeedbackCopy({
      ...strings,
      feedback: { ...strings.feedback, incorrect: '¡Vaya, fallaste! Inténtalo mejor la próxima vez.' },
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/feedback\.incorrect/);
    expect(errors[0]).toMatch(/negative language/);
  });

  test('flags an empty or missing field', () => {
    const errors = validateFeedbackCopy({ ...strings, funFactHeading: '' });

    expect(errors).toContainEqual(expect.stringContaining('funFactHeading'));
  });

  test('does not flag words that merely contain a banned word as a substring', () => {
    expect(
      validateFeedbackCopy({
        ...strings,
        feedback: { ...strings.feedback, incorrect: '¡Aprender sobre dinosaurios mola muchísimo!' },
      })
    ).toEqual([]);
  });
});

describe('QuestionScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the question prompt and one accessible button per option', () => {
    const question = buildQuestion();
    renderQuestionScreen(container, question);

    expect(getByText(container, question.question)).toBeInTheDocument();
    const buttons = getAllByRole(container, 'button');
    expect(buttons).toHaveLength(question.options.length);
    question.options.forEach((optionText) => {
      expect(getByRole(container, 'button', { name: optionText })).toBeInTheDocument();
    });
  });

  test('renders the dinosaur illustration above the prompt with a descriptive alt-text (TRIOFSND-72, AC-4/AC-14)', () => {
    const question = buildQuestion();
    const { image, prompt } = renderQuestionScreen(container, question);

    expect(image.tagName).toBe('IMG');
    expect(image).toHaveAttribute('src', `/assets/images/${question.image}`);
    expect(image.alt).toContain('Tyrannosaurus Rex');
    expect(image.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('starts the score at 0 by default', () => {
    renderQuestionScreen(container, buildQuestion());

    expect(getByText(container, `${strings.scoreLabel}: 0`)).toBeInTheDocument();
  });

  test('the score text style meets the minimum 20sp font size (TRIOFSND-83)', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf-8');

    // Sizes are design tokens (custom properties set in :root, mirrored in
    // src/theme/designTokens.js) rather than literal values on the rule
    // itself — resolve `var(--x)` against that :root map before asserting.
    const rootMatch = css.match(/:root\s*{([^}]*)}/);
    expect(rootMatch).not.toBeNull();
    const tokens = {};
    for (const tokenMatch of rootMatch[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
      tokens[tokenMatch[1]] = tokenMatch[2].trim();
    }

    const resolve = (rawValue) => {
      const varMatch = rawValue.match(/^var\((--[\w-]+)\)$/);
      return varMatch ? tokens[varMatch[1]] : rawValue;
    };

    const ruleMatch = css.match(/\.question-screen__score\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();

    // Accessibility tokens (TRIOFSND-133) moved this rule onto a CSS custom
    // property (`var(--font-size-body)`); resolve it via the shared helper.
    const rule = resolveCssCustomProperties(css, ruleMatch[1]);
    const fontSizeMatch = rule.match(/font-size:\s*([\d.]+)(px|rem)/);
    expect(fontSizeMatch).not.toBeNull();

    const fontSizePx = fontSizeMatch[2] === 'rem'
      ? parseFloat(fontSizeMatch[1]) * 16
      : parseFloat(fontSizeMatch[1]);
    expect(fontSizePx).toBeGreaterThanOrEqual(20);
  });

  describe('on a correct answer', () => {
    test('adds +1 to the score, highlights the option green, and plays the celebration animation', () => {
      const question = buildQuestion();
      const onAnswer = jest.fn();
      const { optionButtons, getScore } = renderQuestionScreen(container, question, { score: 3, onAnswer });

      const correctButton = optionButtons[question.correctAnswerIndex];
      correctButton.click();

      expect(correctButton).toHaveClass('question-screen__option--correct');
      expect(correctButton).toHaveClass('question-screen__option--celebrate');
      expect(getScore()).toBe(4);
      expect(getByText(container, `${strings.scoreLabel}: 4`)).toBeInTheDocument();
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: true,
          score: 4,
          scoreDelta: 1,
          correctIndex: question.correctAnswerIndex,
          selectedIndex: question.correctAnswerIndex,
        })
      );
    });

    test('shows the celebratory feedback copy', () => {
      const question = buildQuestion();
      const { optionButtons, feedback } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      expect(feedback).toHaveTextContent(strings.feedback.correct);
    });

    test('announces the hit and the correct answer text via an aria-live status region (TRIOFSND-79, AC-14)', () => {
      const question = buildQuestion();
      const { optionButtons, announcementEl } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      expect(announcementEl).toHaveAttribute('aria-live', 'polite');
      expect(announcementEl).toHaveAttribute('role', 'status');
      expect(announcementEl).toHaveTextContent(
        strings.answerAnnouncement.correct.replace('{correctAnswer}', question.options[question.correctAnswerIndex])
      );
    });

    test('reveals the fun fact and the "Siguiente" control', () => {
      const question = buildQuestion();
      const { optionButtons, funFactBox, funFact, nextButton } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      expect(funFactBox).toBeVisible();
      expect(funFactBox).toHaveClass('question-screen__fun-fact-box');
      expect(funFact).toHaveTextContent(question.funFact);
      expect(funFact).toBeVisible();
      expect(nextButton).toBeVisible();
    });
  });

  describe('on an incorrect answer (TRIOFSND-88: no penalty)', () => {
    test('leaves the score exactly as it was (+0)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, getScore } = renderQuestionScreen(container, question, { score: 5 });

      optionButtons[wrongIndex].click();

      expect(getScore()).toBe(5);
      expect(getByText(container, `${strings.scoreLabel}: 5`)).toBeInTheDocument();
    });

    test('does not let the score go below its pre-answer value across several misses', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);

      [0, 1, 2].forEach(() => {
        const view = renderQuestionScreen(container, question, { score: 2 });
        view.optionButtons[wrongIndex].click();
        expect(view.getScore()).toBe(2);
      });
    });

    test('marks only the chosen option as neutral (no red styling) and highlights the correct option, without the celebration animation', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(optionButtons[wrongIndex]).toHaveClass('question-screen__option--neutral');
      expect(optionButtons[wrongIndex]).not.toHaveClass('question-screen__option--correct');
      expect(optionButtons[wrongIndex].className).not.toMatch(/wrong|incorrect|error|bad/i);
      expect(optionButtons[question.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
      expect(optionButtons[question.correctAnswerIndex]).not.toHaveClass('question-screen__option--celebrate');
    });

    test('still reveals the fun fact and the "Siguiente" control, same as a hit', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, funFactBox, funFact, nextButton } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(funFactBox).toBeVisible();
      expect(funFact).toHaveTextContent(question.funFact);
      expect(funFact).toBeVisible();
      expect(nextButton).toBeVisible();
    });

    test('shows a neutral/positive-toned message, never a negative one', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, feedback } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(feedback).toHaveTextContent(strings.feedback.incorrect);
      expect(feedback.textContent.toLowerCase()).not.toMatch(/mal|incorrecto|fallaste|error/);
    });

    test('the aria-live feedback announcement spells out the correct answer text, not just "esta" (TRIOFSND-90, AC-14)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, feedback } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(feedback).toHaveAttribute('aria-live', 'polite');
      expect(feedback).toHaveTextContent(question.options[question.correctAnswerIndex]);
    });

    test('gives the correct option a descriptive "Respuesta correcta" aria-label, and the tapped option a neutral one (TRIOFSND-90)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      const correctButton = optionButtons[question.correctAnswerIndex];
      const wrongButton = optionButtons[wrongIndex];

      expect(correctButton.getAttribute('aria-label')).toContain(question.options[question.correctAnswerIndex]);
      expect(correctButton.getAttribute('aria-label').toLowerCase()).not.toMatch(/mal|incorrecto|fallaste|error|wrong/);
      expect(wrongButton.getAttribute('aria-label')).toContain(question.options[wrongIndex]);
      expect(wrongButton.getAttribute('aria-label').toLowerCase()).not.toMatch(/mal|incorrecto|fallaste|error|wrong/);
    });

    test('keeps the dinosaur illustration and its descriptive alt-text unchanged after a miss (TRIOFSND-90)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, image } = renderQuestionScreen(container, question);
      const altBeforeAnswering = image.alt;

      optionButtons[wrongIndex].click();

      expect(image.alt).toBe(altBeforeAnswering);
      expect(image.alt).toContain('Tyrannosaurus Rex');
      expect(image).toBeVisible();
    });

    test('announces the miss and the correct answer text via an aria-live status region, without a sighted-only pointer like "esta" (TRIOFSND-79, AC-14)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, announcementEl } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(announcementEl).toHaveAttribute('aria-live', 'polite');
      expect(announcementEl).toHaveAttribute('role', 'status');
      expect(announcementEl).toHaveTextContent(
        strings.answerAnnouncement.incorrect.replace('{correctAnswer}', question.options[question.correctAnswerIndex])
      );
      expect(announcementEl).toHaveTextContent(question.options[question.correctAnswerIndex]);
    });

    test('reports scoreDelta 0 and isCorrect false via onAnswer', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const onAnswer = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { score: 6, onAnswer });

      optionButtons[wrongIndex].click();

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
          score: 6,
          scoreDelta: 0,
          correctIndex: question.correctAnswerIndex,
          selectedIndex: wrongIndex,
        })
      );
    });

    test('advancing via "Siguiente" carries forward the unchanged score', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
        const onNext = jest.fn();
        const { optionButtons, nextButton } = renderQuestionScreen(container, question, { score: 6, onNext });

        optionButtons[wrongIndex].click();
        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
        nextButton.click();

        expect(onNext).toHaveBeenCalledWith(6);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('fail sound (TRIOFSND-89: neutral sound integrated with mute mode)', () => {
    test('plays the neutral fail sound on a miss', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const playFailSound = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { playFailSound });

      optionButtons[wrongIndex].click();

      expect(playFailSound).toHaveBeenCalledTimes(1);
    });

    test('does not play any sound on a hit', () => {
      const question = buildQuestion();
      const playFailSound = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { playFailSound });

      optionButtons[question.correctAnswerIndex].click();

      expect(playFailSound).not.toHaveBeenCalled();
    });

    test('forwards options.muted through to the sound player, so silent mode stays silent', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const playFailSound = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { playFailSound, muted: true });

      optionButtons[wrongIndex].click();

      expect(playFailSound).toHaveBeenCalledWith(expect.objectContaining({ muted: true }));
    });

    test('defaults muted to false when options.muted is not provided', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const playFailSound = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { playFailSound });

      optionButtons[wrongIndex].click();

      expect(playFailSound).toHaveBeenCalledWith(expect.objectContaining({ muted: false }));
    });

    test('the fun fact and "Siguiente" are already visible by the time the sound player is called', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      let funFactVisibleAtCallTime = null;
      let nextButtonVisibleAtCallTime = null;
      const playFailSound = jest.fn(() => {
        funFactVisibleAtCallTime = !funFact.hidden;
        nextButtonVisibleAtCallTime = !nextButton.hidden;
      });

      const { optionButtons, funFact, nextButton } = renderQuestionScreen(container, question, { playFailSound });
      optionButtons[wrongIndex].click();

      expect(funFactVisibleAtCallTime).toBe(true);
      expect(nextButtonVisibleAtCallTime).toBe(true);
    });
  });

  test('starts from a given running score and only adds on a hit', () => {
    const question = buildQuestion();
    const { optionButtons, getScore } = renderQuestionScreen(container, question, { score: 4 });

    optionButtons[question.correctAnswerIndex].click();

    expect(getScore()).toBe(5);
  });

  test('once answered, all options are disabled so a second tap cannot change the score or re-trigger onAnswer', () => {
    const question = buildQuestion();
    const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
    const onAnswer = jest.fn();
    const { optionButtons, getScore } = renderQuestionScreen(container, question, { onAnswer });

    optionButtons[wrongIndex].click();
    optionButtons[question.correctAnswerIndex].click();

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(getScore()).toBe(0);
    optionButtons.forEach((optionButton) => expect(optionButton).toBeDisabled());
  });

  test('feedback classes are applied synchronously in the click handler, well within the 300ms budget (AC-5)', () => {
    jest.useFakeTimers();
    try {
      const question = buildQuestion();
      const { optionButtons } = renderQuestionScreen(container, question);

      const start = performance.now();
      optionButtons[question.correctAnswerIndex].click();
      const elapsed = performance.now() - start;

      // Feedback classes land before any timer fires — only the advance
      // timer (gating "Siguiente", see below) is scheduled.
      expect(optionButtons[question.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
      expect(elapsed).toBeLessThan(300);
      expect(jest.getTimerCount()).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  describe('image (AC-14: alt-text for screen readers)', () => {
    test('renders the dinosaur illustration with a descriptive alt built from the i18n dinosaur name and its fun fact', () => {
      const question = buildQuestion();
      const { image } = renderQuestionScreen(container, question);

      const expectedAlt = [
        strings.imageAlt.replace('{dinosaur}', strings.dinosaurNames.trex),
        strings.imageAltFunFact.replace('{funFact}', question.funFact),
      ].join(' ');

      expect(image.tagName).toBe('IMG');
      expect(image.src).toContain(question.image);
      expect(image.alt).toBe(expectedAlt);
      expect(image.alt).toContain(strings.dinosaurNames.trex);
      expect(image.alt).toContain(question.funFact);
    });

    test('falls back to just the dinosaur name when no fun fact is available', () => {
      const question = buildQuestion({ funFact: undefined });
      const { image } = renderQuestionScreen(container, question);

      expect(image.alt).toBe(strings.imageAlt.replace('{dinosaur}', strings.dinosaurNames.trex));
    });

    test('TRIOFSND-135: every question in the 40-question bank gets a non-empty alt with its dinosaur name and dato curioso', () => {
      const questions = loadQuestionBank();
      const allStrings = require('../i18n').getStrings('es');

      expect(questions).toHaveLength(40);

      questions.forEach((question) => {
        const funFact = resolveDatoCurioso(allStrings, question.dato_curioso);
        const { image } = renderQuestionScreen(container, { ...question, funFact });

        const dinosaurName = strings.dinosaurNames[question.dinosaur] || question.dinosaur;

        expect(image.alt.length).toBeGreaterThan(0);
        expect(image.alt).toContain(dinosaurName);
        expect(image.alt).toContain(funFact);
      });
    });
  });

  describe('answer announcement (TRIOFSND-79: accessible result announcement)', () => {
    test('the announcement region is present from the first render, empty, and visually hidden (screen-reader-only)', () => {
      const question = buildQuestion();
      const { announcementEl } = renderQuestionScreen(container, question);

      expect(announcementEl).toBeInTheDocument();
      expect(announcementEl).toHaveClass('sr-only');
      expect(announcementEl).toHaveTextContent('');
    });

    test('is written synchronously in the click handler, not gated on the fun-fact timer or any sound/visual cue', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const { optionButtons, announcementEl } = renderQuestionScreen(container, question);

        optionButtons[question.correctAnswerIndex].click();

        // No timer advanced yet: the announcement must already be set.
        expect(announcementEl.textContent.length).toBeGreaterThan(0);
      } finally {
        jest.useRealTimers();
      }
    });

    test('a second tap after answering does not change the announcement', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, announcementEl } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();
      const firstAnnouncement = announcementEl.textContent;
      optionButtons[question.correctAnswerIndex].click();

      expect(announcementEl).toHaveTextContent(firstAnnouncement);
    });
  });

  describe('"Siguiente" advance timer (AC-6: dato curioso visible >=4s before advancing)', () => {
    test('shows "Siguiente" disabled as soon as the answer is revealed', () => {
      const question = buildQuestion();
      const { optionButtons, nextButton } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      expect(nextButton).toBeVisible();
      expect(nextButton).toBeDisabled();
    });

    test('clicking "Siguiente" before the timer elapses does not advance', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const onNext = jest.fn();
        const { optionButtons, nextButton } = renderQuestionScreen(container, question, { onNext });

        optionButtons[question.correctAnswerIndex].click();
        nextButton.click();
        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS - 1);

        expect(nextButton).toBeDisabled();
        expect(onNext).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    test('enables "Siguiente" once MIN_ADVANCE_DELAY_MS has elapsed, letting the child advance', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const onNext = jest.fn();
        const { optionButtons, nextButton, getScore } = renderQuestionScreen(container, question, { onNext });

        optionButtons[question.correctAnswerIndex].click();
        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);

        expect(nextButton).not.toBeDisabled();
        nextButton.click();
        expect(onNext).toHaveBeenCalledWith(getScore());
      } finally {
        jest.useRealTimers();
      }
    });
  });

  test('does not hardcode copy — text is sourced from the es locale resource file', () => {
    const question = buildQuestion();
    const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
    const { optionButtons, nextButton } = renderQuestionScreen(container, question, { locale: 'es' });

    expect(getByRole(container, 'group', { name: strings.optionsGroupLabel })).toBeInTheDocument();

    optionButtons[wrongIndex].click();

    expect(container.textContent).toContain(strings.feedback.incorrect);
    expect(nextButton).toHaveTextContent(strings.nextButton);
  });

  describe('rewarded-ad CTA for an extra dato curioso (TRIOFSND-86)', () => {
    function fakeAdService(overrides = {}) {
      return {
        isAvailable: () => true,
        request: () => Promise.resolve({ granted: true }),
        ...overrides,
      };
    }

    test('stays hidden when the ads hook reports no rewarded ad is available, and never blocks "Siguiente"', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const rewardedAdService = fakeAdService({ isAvailable: () => false });
        const onNext = jest.fn();
        const { optionButtons, rewardedAdCta, nextButton } = renderQuestionScreen(container, question, {
          rewardedAdService,
          onNext,
        });

        optionButtons[question.correctAnswerIndex].click();

        expect(rewardedAdCta.hidden).toBe(true);

        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
        expect(nextButton).not.toBeDisabled();
        nextButton.click();
        expect(onNext).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    test('is revealed, clearly labeled as an ad, once the answer is fed back and the ads hook reports availability', () => {
      const question = buildQuestion();
      const { optionButtons, rewardedAdCta } = renderQuestionScreen(container, question, {
        rewardedAdService: fakeAdService(),
      });

      expect(rewardedAdCta.hidden).toBe(true);

      optionButtons[question.correctAnswerIndex].click();

      expect(rewardedAdCta.hidden).toBe(false);
      expect(rewardedAdCta).toHaveAccessibleName(strings.rewardedAd.ctaAriaLabel);
      expect(rewardedAdCta.textContent.toLowerCase()).toContain('anuncio');
    });

    test('reveals the extra dato curioso once the rewarded ad is watched to completion, without touching "Siguiente"', async () => {
      const question = buildQuestion();
      const rewardedAdService = fakeAdService({ request: () => Promise.resolve({ granted: true }) });
      const { optionButtons, rewardedAdCta, extraFunFactBox, extraFunFact, nextButton } = renderQuestionScreen(
        container,
        question,
        { rewardedAdService }
      );

      optionButtons[question.correctAnswerIndex].click();
      expect(nextButton).toBeDisabled();

      rewardedAdCta.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(extraFunFactBox.hidden).toBe(false);
      expect(extraFunFact).toHaveTextContent(strings.rewardedAd.extraFacts.trex);
      expect(rewardedAdCta.hidden).toBe(true);
      // Watching the ad never re-enables "Siguiente" early, nor disables it further.
      expect(nextButton).toBeDisabled();
    });

    test('shows a neutral status and keeps the game going when the rewarded ad is not completed', async () => {
      const question = buildQuestion();
      const rewardedAdService = fakeAdService({ request: () => Promise.resolve({ granted: false }) });
      const onNext = jest.fn();
      const { optionButtons, rewardedAdCta, rewardedAdStatus, extraFunFactBox, nextButton } = renderQuestionScreen(
        container,
        question,
        { rewardedAdService, onNext }
      );

      optionButtons[question.correctAnswerIndex].click();
      rewardedAdCta.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(extraFunFactBox.hidden).toBe(true);
      expect(rewardedAdStatus).toHaveTextContent(strings.rewardedAd.notCompletedMessage);
      expect(rewardedAdCta).toBeDisabled();
    });

    test('disables itself immediately on click so a double-tap only requests the ad once', () => {
      const question = buildQuestion();
      const request = jest.fn().mockResolvedValue({ granted: true });
      const { optionButtons, rewardedAdCta } = renderQuestionScreen(container, question, {
        rewardedAdService: fakeAdService({ request }),
      });

      optionButtons[question.correctAnswerIndex].click();
      rewardedAdCta.click();
      rewardedAdCta.click();

      expect(request).toHaveBeenCalledTimes(1);
      expect(rewardedAdCta).toBeDisabled();
    });
  });
});
