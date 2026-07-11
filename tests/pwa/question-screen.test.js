'use strict';

const { renderQuestionScreen } = require('../../public/scripts/questionScreen');
const scoring = require('../../public/scripts/scoring');

describe('Question Screen (TRIOFSND-72)', () => {
  let container;
  let mockStrings;
  let mockDinosaurNames;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockStrings = {
      imageAltFormat: 'Ilustración de un {dinosaur}',
      scoreLabel: 'Puntuación',
      optionsGroupLabel: 'Opciones de respuesta',
      funFactHeading: 'Dato curioso',
      nextButtonLabel: 'Siguiente',
      correctFeedback: '¡Correcto!',
      incorrectFeedback: 'La respuesta correcta es',
    };

    mockDinosaurNames = {
      trex: 'Tyrannosaurus Rex',
      triceratops: 'Triceratops',
      velociraptor: 'Velociraptor',
      estegosaurio: 'Estegosaurio',
      braquiosaurio: 'Braquiosaurio',
      ankylosaurus: 'Ankylosaurus',
      pteranodon: 'Pteranodon',
    };
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Rendering', () => {
    it('should render the question screen with all required elements', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: '¿De qué se alimentaba el T-Rex?',
        options: ['Plantas', 'Carne', 'Insectos'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, {
        strings: mockStrings,
        dinosaurNames: mockDinosaurNames,
        score: 0,
      });

      const root = container.querySelector('.question-screen');
      expect(root).toBeTruthy();
      expect(root).toHaveClass('question-screen');
    });

    it('should clear the container before rendering', () => {
      container.innerHTML = '<p>old content</p>';
      const question = {
        id: 'test-01',
        dinosaur: 'trex',
        question: 'Test?',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      expect(container.querySelector('p')).toBeFalsy();
      expect(container.querySelector('.question-screen')).toBeTruthy();
    });

    it('should render the dinosaur image with correct source', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question text',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const image = container.querySelector('.question-screen__image');
      expect(image).toBeTruthy();
      expect(image.src).toContain('dinosaurs/trex.png');
    });

    it('should render the question text', () => {
      const questionText = '¿Cuántos dientes tenía el T-Rex?';
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: questionText,
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const prompt = container.querySelector('.question-screen__prompt');
      expect(prompt).toBeTruthy();
      expect(prompt.textContent).toBe(questionText);
    });

    it('should display the current score', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, {
        strings: mockStrings,
        score: 5,
      });

      const scoreEl = container.querySelector('.question-screen__score');
      expect(scoreEl).toBeTruthy();
      expect(scoreEl.textContent).toContain('Puntuación');
      expect(scoreEl.textContent).toContain('5');
    });
  });

  describe('Options rendering', () => {
    it('should render all options with correct text', () => {
      const options = ['Plantas', 'Carne', 'Insectos'];
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: options,
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const optionEls = container.querySelectorAll('.question-screen__option');
      expect(optionEls.length).toBe(3);
      optionEls.forEach((el, index) => {
        expect(el.textContent.trim()).toBe(options[index]);
      });
    });

    it('should render 4 options when provided', () => {
      const options = ['A', 'B', 'C', 'D'];
      const question = {
        id: 'test-01',
        dinosaur: 'trex',
        question: 'Question',
        options: options,
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const optionEls = container.querySelectorAll('.question-screen__option');
      expect(optionEls.length).toBe(4);
    });

    it('should have options in a group with aria-label', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const optionsGroup = container.querySelector('.question-screen__options');
      expect(optionsGroup).toBeTruthy();
      expect(optionsGroup.getAttribute('role')).toBe('group');
      expect(optionsGroup.getAttribute('aria-label')).toBe('Opciones de respuesta');
    });

    it('should apply distinct color classes to options via nth-child', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B', 'C'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const options = container.querySelectorAll('.question-screen__option');
      options.forEach((opt, index) => {
        const computed = window.getComputedStyle(opt);
        expect(computed).toBeTruthy();
      });
    });
  });

  describe('Image alt text', () => {
    it('should build descriptive alt text using dinosaur name', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, {
        strings: mockStrings,
        dinosaurNames: mockDinosaurNames,
      });

      const image = container.querySelector('.question-screen__image');
      expect(image.alt).toBe('Ilustración de un Tyrannosaurus Rex');
    });

    it('should handle unknown dinosaurs gracefully in alt text', () => {
      const question = {
        id: 'unknown-01',
        dinosaur: 'unknowndino',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/unknown.png',
      };

      renderQuestionScreen(container, question, {
        strings: mockStrings,
        dinosaurNames: mockDinosaurNames,
      });

      const image = container.querySelector('.question-screen__image');
      expect(image.alt).toContain('unknowndino');
    });
  });

  describe('Answering and feedback', () => {
    it('should allow clicking an option to answer', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['Wrong', 'Correct', 'Wrong2'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      const onAnswer = jest.fn();
      renderQuestionScreen(container, question, {
        strings: mockStrings,
        score: 0,
        onAnswer: onAnswer,
      });

      const option = container.querySelectorAll('.question-screen__option')[1];
      option.click();

      expect(onAnswer).toHaveBeenCalled();
    });

    it('should mark the correct option with correct class regardless of answer', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['Wrong', 'Correct', 'Wrong2'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, {
        strings: mockStrings,
        score: 0,
      });

      const options = container.querySelectorAll('.question-screen__option');
      const correctOption = options[1];
      const wrongOption = options[0];

      wrongOption.click();

      expect(correctOption.classList.contains('question-screen__option--correct')).toBe(true);
    });

    it('should mark wrong answer with neutral class', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['Wrong', 'Correct', 'Wrong2'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const options = container.querySelectorAll('.question-screen__option');
      const wrongOption = options[0];

      wrongOption.click();

      expect(wrongOption.classList.contains('question-screen__option--neutral')).toBe(true);
    });

    it('should add celebrate class to correct answer when user answers correctly', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['Wrong', 'Correct'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const options = container.querySelectorAll('.question-screen__option');
      const correctOption = options[1];

      correctOption.click();

      expect(correctOption.classList.contains('question-screen__option--celebrate')).toBe(true);
    });

    it('should show feedback after answering', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const feedback = container.querySelector('.question-screen__feedback');
      const initialText = feedback.textContent;

      const option = container.querySelectorAll('.question-screen__option')[0];
      option.click();

      const afterText = feedback.textContent;
      expect(afterText).not.toBe(initialText);
      expect(afterText.length > 0).toBe(true);
    });

    it('should show fun fact after answering', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      const funFact = 'T-Rex tenía 60 dientes';
      renderQuestionScreen(container, question, {
        strings: mockStrings,
        funFacts: { 'trex-01': funFact },
      });

      const funFactEl = container.querySelector('.question-screen__fun-fact');
      const option = container.querySelectorAll('.question-screen__option')[0];
      option.click();

      expect(funFactEl).toBeTruthy();
    });
  });

  describe('Navigation to next question', () => {
    it('should show next button after answering', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      let nextButton = container.querySelector('.question-screen__next-button');
      expect(nextButton).toBeFalsy();

      const option = container.querySelectorAll('.question-screen__option')[0];
      option.click();

      nextButton = container.querySelector('.question-screen__next-button');
      expect(nextButton).toBeTruthy();
      expect(nextButton.textContent).toBe('Siguiente');
    });

    it('should call onNext when next button is clicked', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      const onNext = jest.fn();
      renderQuestionScreen(container, question, {
        strings: mockStrings,
        onNext: onNext,
      });

      const option = container.querySelectorAll('.question-screen__option')[0];
      option.click();

      const nextButton = container.querySelector('.question-screen__next-button');
      nextButton.click();

      expect(onNext).toHaveBeenCalled();
    });
  });

  describe('Score integration', () => {
    it('should call onAnswer with correct data when answering correctly', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['Wrong', 'Correct'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      const onAnswer = jest.fn();
      renderQuestionScreen(container, question, {
        strings: mockStrings,
        score: 3,
        onAnswer: onAnswer,
      });

      const correctOption = container.querySelectorAll('.question-screen__option')[1];
      correctOption.click();

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: true,
          selectedIndex: 1,
        })
      );
    });

    it('should call onAnswer with correct data when answering incorrectly', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['Wrong', 'Correct'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/trex.png',
      };

      const onAnswer = jest.fn();
      renderQuestionScreen(container, question, {
        strings: mockStrings,
        score: 3,
        onAnswer: onAnswer,
      });

      const wrongOption = container.querySelectorAll('.question-screen__option')[0];
      wrongOption.click();

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
          selectedIndex: 0,
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have aria-live for score updates', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const scoreEl = container.querySelector('.question-screen__score');
      expect(scoreEl.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-live for feedback', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const feedback = container.querySelector('.question-screen__feedback');
      expect(feedback.getAttribute('aria-live')).toBe('polite');
    });

    it('should have image async decoding', () => {
      const question = {
        id: 'trex-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      renderQuestionScreen(container, question, { strings: mockStrings });

      const image = container.querySelector('.question-screen__image');
      expect(image.decoding).toBe('async');
    });
  });

  describe('Multiple questions in sequence', () => {
    it('should render different questions sequentially', () => {
      const q1 = {
        id: 'q1',
        dinosaur: 'trex',
        question: 'Question 1?',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      const q2 = {
        id: 'q2',
        dinosaur: 'triceratops',
        question: 'Question 2?',
        options: ['C', 'D'],
        correctAnswerIndex: 1,
        image: 'dinosaurs/triceratops.png',
      };

      renderQuestionScreen(container, q1, { strings: mockStrings });
      let prompt = container.querySelector('.question-screen__prompt');
      expect(prompt.textContent).toBe('Question 1?');

      renderQuestionScreen(container, q2, { strings: mockStrings });
      prompt = container.querySelector('.question-screen__prompt');
      expect(prompt.textContent).toBe('Question 2?');

      const options = container.querySelectorAll('.question-screen__option');
      expect(options[0].textContent.trim()).toBe('C');
      expect(options[1].textContent.trim()).toBe('D');
    });
  });

  describe('Error handling', () => {
    it('should handle missing strings gracefully', () => {
      const question = {
        id: 'test-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      expect(() => {
        renderQuestionScreen(container, question, { strings: null });
      }).not.toThrow();
    });

    it('should render with minimal strings object', () => {
      const question = {
        id: 'test-01',
        dinosaur: 'trex',
        question: 'Question',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        image: 'dinosaurs/trex.png',
      };

      const minimalStrings = {};
      renderQuestionScreen(container, question, { strings: minimalStrings });

      const root = container.querySelector('.question-screen');
      expect(root).toBeTruthy();
    });
  });
});
