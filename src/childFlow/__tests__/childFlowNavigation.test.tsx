import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChildFlow } from '../ChildFlow';
import { HomeScreen } from '../screens/HomeScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { isExternalUrl } from '../navigation/navigationGuard';

function expectNoAnchors(container: HTMLElement) {
  const anchors = Array.from(container.querySelectorAll('a'));
  expect(anchors).toHaveLength(0);
}

function expectNoExternalAnchors(container: HTMLElement) {
  const anchors = Array.from(container.querySelectorAll('a'));
  anchors.forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? '';
    expect(isExternalUrl(href)).toBe(false);
    expect(anchor.getAttribute('target')).not.toBe('_blank');
  });
}

function clickEveryEnabledButton(container: HTMLElement) {
  const buttons = Array.from(container.querySelectorAll('button'));
  buttons.forEach((button) => {
    if (!button.hasAttribute('disabled')) {
      fireEvent.click(button);
    }
  });
}

describe('Flujo del nino: sin navegacion externa', () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('HomeScreen no contiene enlaces y ningun boton dispara window.open', () => {
    const { container } = render(
      <HomeScreen
        isMuted={false}
        onToggleMute={jest.fn()}
        onPlay={jest.fn()}
        onOpenPrivacyPolicy={jest.fn()}
        onOpenRemoveAds={jest.fn()}
      />
    );

    expectNoAnchors(container);
    expectNoExternalAnchors(container);
    clickEveryEnabledButton(container);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('QuizScreen no contiene enlaces y ningun boton dispara window.open', () => {
    const { container } = render(
      <QuizScreen
        questionNumber={1}
        totalQuestions={3}
        prompt="¿Que dinosaurio tenia cuernos?"
        dinosaurImageAlt="Triceratops"
        dinosaurImageSrc="/assets/dinosaurs/triceratops.png"
        options={[
          { id: 'a', text: 'Triceratops' },
          { id: 'b', text: 'T-Rex' },
        ]}
        onSelectOption={jest.fn()}
        feedback={{ isCorrect: true, funFact: 'Tenia tres cuernos.' }}
        onNext={jest.fn()}
        isMuted={false}
        onToggleMute={jest.fn()}
      />
    );

    expectNoAnchors(container);
    expectNoExternalAnchors(container);
    clickEveryEnabledButton(container);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('ResultsScreen no contiene enlaces y ningun boton dispara window.open', () => {
    const { container } = render(
      <ResultsScreen
        score={8}
        totalQuestions={10}
        stars={3}
        motivationalMessage="¡Lo has hecho genial!"
        onPlayAgain={jest.fn()}
        onExitToHome={jest.fn()}
        isMuted={false}
        onToggleMute={jest.fn()}
      />
    );

    expectNoAnchors(container);
    expectNoExternalAnchors(container);
    clickEveryEnabledButton(container);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('recorre Inicio -> Quiz -> Resultados -> Volver a jugar sin ninguna navegacion externa', () => {
    const { container } = render(<ChildFlow />);

    expectNoAnchors(container);
    fireEvent.click(container.querySelector('button.play-button') as HTMLButtonElement);

    for (let step = 0; step < 3; step += 1) {
      expectNoAnchors(container);

      const optionButton = container.querySelector('button.option-button') as HTMLButtonElement;
      expect(optionButton).not.toBeNull();
      fireEvent.click(optionButton);

      const nextButton = container.querySelector('button.next-button') as HTMLButtonElement;
      expect(nextButton).not.toBeNull();
      fireEvent.click(nextButton);
    }

    expectNoAnchors(container);
    const scoreText = container.querySelector('.score-text');
    expect(scoreText).not.toBeNull();

    const playAgainButton = container.querySelector('button.play-again-button') as HTMLButtonElement;
    fireEvent.click(playAgainButton);

    expectNoAnchors(container);
    expect(container.querySelector('button.option-button')).not.toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
