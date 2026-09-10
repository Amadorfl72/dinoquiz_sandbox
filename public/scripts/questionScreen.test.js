'use strict';

require('@testing-library/jest-dom');

const { renderQuestionScreen } = require('./questionScreen');
const { question: strings } = require('../i18n/es.json');

function buildQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    dinosaur: 'trex',
    question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
    options: ['Solo de plantas', 'De carne, ¡era un gran cazador!', 'Solo de insectos'],
    correctAnswerIndex: 1,
    funFact: 'El T-Rex tenía la mordida más fuerte de todos los dinosaurios carnívoros conocidos.',
    image: 'dinosaurs/trex.png',
    ...overrides,
  };
}

describe('public/scripts/questionScreen.js — "Siguiente" inmediato, orden DOM y regresión (TRIOFSND-88, AC-6)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('"Siguiente" queda habilitado en la misma actualización, sin avanzar fake timers', () => {
    test('tras una respuesta correcta', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const { optionButtons, nextButton } = renderQuestionScreen(container, question);

        optionButtons[question.correctAnswerIndex].click();

        expect(nextButton.hidden).toBe(false);
        expect(nextButton).not.toBeDisabled();
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });

    test('tras una respuesta incorrecta', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
        const { optionButtons, nextButton } = renderQuestionScreen(container, question);

        optionButtons[wrongIndex].click();

        expect(nextButton.hidden).toBe(false);
        expect(nextButton).not.toBeDisabled();
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  test('"Siguiente" precede al dato curioso en el orden del DOM', () => {
    const question = buildQuestion();
    const { optionButtons, nextButton, funFactBox } = renderQuestionScreen(container, question);

    optionButtons[question.correctAnswerIndex].click();

    expect(nextButton.compareDocumentPosition(funFactBox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  describe('pulsar otra opción tras responder no cambia la puntuación ni el resultado', () => {
    test('tocar la opción correcta después de haber acertado no cambia nada', () => {
      const question = buildQuestion();
      const onAnswer = jest.fn();
      const { optionButtons, getScore, feedback } = renderQuestionScreen(container, question, { score: 2, onAnswer });

      optionButtons[question.correctAnswerIndex].click();
      const feedbackAfterFirstAnswer = feedback.textContent;
      optionButtons[question.correctAnswerIndex].click();

      expect(getScore()).toBe(3);
      expect(feedback.textContent).toBe(feedbackAfterFirstAnswer);
      expect(onAnswer).toHaveBeenCalledTimes(1);
    });

    test('tocar otra opción tras haber fallado no cambia la puntuación ni el feedback', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const onAnswer = jest.fn();
      const { optionButtons, getScore, feedback } = renderQuestionScreen(container, question, { score: 2, onAnswer });

      optionButtons[wrongIndex].click();
      const feedbackAfterFirstAnswer = feedback.textContent;
      optionButtons[question.correctAnswerIndex].click();

      expect(getScore()).toBe(2);
      expect(feedback.textContent).toBe(feedbackAfterFirstAnswer);
      expect(onAnswer).toHaveBeenCalledTimes(1);
    });

    test('todas las opciones quedan deshabilitadas nada más responder, así que un segundo toque no puede alterar el resultado', () => {
      const question = buildQuestion();
      const { optionButtons } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      optionButtons.forEach((optionButton) => expect(optionButton).toBeDisabled());
    });
  });

  test('regresión: sin temporizadores, sin bloqueo de "Siguiente" y sin dependencia de red/fetch en este flujo', () => {
    const originalFetch = window.fetch;
    window.fetch = jest.fn();
    jest.useFakeTimers();

    try {
      const question = buildQuestion();
      const { optionButtons, nextButton } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      // AC-6: no timer is scheduled to reveal/enable "Siguiente" — it must
      // already be usable in this same synchronous update.
      expect(jest.getTimerCount()).toBe(0);

      // "Siguiente" must never come back disabled once the answer feedback
      // has been rendered (that would silently break the advance flow).
      expect(nextButton.hidden).toBe(false);
      expect(nextButton).not.toBeDisabled();

      // DinoQuiz has no backend (CONVENTIONS.md): answering a question must
      // never trigger a network call.
      expect(window.fetch).not.toHaveBeenCalled();

      jest.runAllTimers();
      expect(nextButton).not.toBeDisabled();
    } finally {
      jest.useRealTimers();
      window.fetch = originalFetch;
    }
  });

  test('does not hardcode "Siguiente" — its text is sourced from the es locale resource file', () => {
    const question = buildQuestion();
    const { optionButtons, nextButton } = renderQuestionScreen(container, question, { locale: 'es' });

    optionButtons[question.correctAnswerIndex].click();

    expect(nextButton).toHaveTextContent(strings.nextButton);
  });
});
