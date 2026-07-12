'use strict';

const { renderQuestionScreen } = require('./QuestionScreen');

describe('QuestionScreen module exports', () => {
  it('should export renderQuestionScreen function', () => {
    expect(typeof renderQuestionScreen).toBe('function');
  });

  it('should be callable from src/screens path', () => {
    const container = document.createElement('div');
    const question = {
      id: 'test-01',
      dinosaur: 'trex',
      question: 'Test question?',
      options: ['A', 'B'],
      correctAnswerIndex: 0,
      image: 'dinosaurs/trex.png',
    };

    const strings = {
      imageAltFormat: 'Image of {dinosaur}',
      scoreLabel: 'Score',
      optionsGroupLabel: 'Options',
      funFactHeading: 'Fun Fact',
      nextButton: 'Next',
    };

    expect(() => {
      renderQuestionScreen(container, question, { strings });
    }).not.toThrow();
  });
});
