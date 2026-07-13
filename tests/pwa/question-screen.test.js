'use strict';

require('@testing-library/jest-dom');

const { renderQuestionScreen } = require('../../public/scripts/questionScreen');
const { question: strings } = require('../../public/i18n/es.json');

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

function fakeAdService(overrides = {}) {
  return {
    isAvailable: () => true,
    request: () => Promise.resolve({ granted: true }),
    ...overrides,
  };
}

describe('public/scripts/questionScreen.js rewarded-ad CTA (TRIOFSND-86, the implementation the real PWA ships)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('stays hidden by default (v1 ships without a real ad SDK wired into the unbundled browser)', () => {
    const question = buildQuestion();
    const { optionButtons, rewardedAdCta } = renderQuestionScreen(container, question);

    optionButtons[question.correctAnswerIndex].click();

    expect(rewardedAdCta.hidden).toBe(true);
  });

  test('is revealed and clearly labeled as an ad once answered, when the injected ads hook reports availability', () => {
    const question = buildQuestion();
    const { optionButtons, rewardedAdCta } = renderQuestionScreen(container, question, {
      rewardedAdService: fakeAdService(),
    });

    optionButtons[question.correctAnswerIndex].click();

    expect(rewardedAdCta.hidden).toBe(false);
    expect(rewardedAdCta.getAttribute('aria-label')).toBe(strings.rewardedAd.ctaAriaLabel);
    expect(rewardedAdCta.textContent.toLowerCase()).toContain('anuncio');
  });

  test('reveals the extra dato curioso on completion without touching "Siguiente"', async () => {
    const question = buildQuestion();
    const { optionButtons, rewardedAdCta, extraFunFactBox, extraFunFact, nextButton } = renderQuestionScreen(
      container,
      question,
      { rewardedAdService: fakeAdService() }
    );

    optionButtons[question.correctAnswerIndex].click();
    const nextButtonWasHidden = nextButton.hidden;
    rewardedAdCta.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(extraFunFactBox.hidden).toBe(false);
    expect(extraFunFact.textContent).toBe(strings.rewardedAd.extraFacts.trex);
    expect(nextButton.hidden).toBe(nextButtonWasHidden);
  });

  test('shows a neutral status and keeps the CTA disabled, without blocking the flow, when the ad is not completed', async () => {
    const question = buildQuestion();
    const { optionButtons, rewardedAdCta, rewardedAdStatus, extraFunFactBox } = renderQuestionScreen(
      container,
      question,
      { rewardedAdService: fakeAdService({ request: () => Promise.resolve({ granted: false }) }) }
    );

    optionButtons[question.correctAnswerIndex].click();
    rewardedAdCta.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(extraFunFactBox.hidden).toBe(true);
    expect(rewardedAdStatus.textContent).toBe(strings.rewardedAd.notCompletedMessage);
    expect(rewardedAdCta.disabled).toBe(true);
  });
});
