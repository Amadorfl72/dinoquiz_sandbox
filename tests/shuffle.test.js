const { shuffleQuestionAnswers } = require('../src/utils/shuffle');

describe('TRIOFSND-38: Question selection and shuffling logic', () => {
  describe('shuffleQuestionAnswers', () => {
    const mockQuestion = {
      id: 'q1',
      text: 'What is 2 + 2?',
      answers: ['3', '4', '5', '6'],
      correctAnswerIndex: 1
    };

    it('preserves correct answer reference after shuffle', () => {
      const shuffled = shuffleQuestionAnswers(mockQuestion);

      const originalCorrectAnswer = mockQuestion.answers[mockQuestion.correctAnswerIndex];
      const shuffledCorrectAnswer = shuffled.answers[shuffled.correctAnswerIndex];
      
      expect(shuffledCorrectAnswer).toBe(originalCorrectAnswer);
    });

    it('shuffles the answers array', () => {
      let hasShuffled = false;
      for (let i = 0; i < 20; i++) {
        const shuffled = shuffleQuestionAnswers(mockQuestion);
        if (JSON.stringify(shuffled.answers) !== JSON.stringify(mockQuestion.answers)) {
          hasShuffled = true;
          break;
        }
      }
      expect(hasShuffled).toBe(true);
    });

    it('preserves all answer options', () => {
      const shuffled = shuffleQuestionAnswers(mockQuestion);
      expect(shuffled.answers.sort()).toEqual([...mockQuestion.answers].sort());
    });

    it('does not mutate the original question object', () => {
      const originalCopy = JSON.parse(JSON.stringify(mockQuestion));
      shuffleQuestionAnswers(mockQuestion);
      expect(mockQuestion).toEqual(originalCopy);
    });
  });
});
