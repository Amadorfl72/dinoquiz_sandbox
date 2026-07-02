const { shuffleQuestions, shuffleQuestionAnswers } = require('../src/utils/questionUtils');

describe('TRIOFSND-38: Question selection and shuffling logic', () => {
  describe('shuffleQuestions', () => {
    const mockQuestions = [
      { id: 'q1', text: 'Question 1' },
      { id: 'q2', text: 'Question 2' },
      { id: 'q3', text: 'Question 3' },
      { id: 'q4', text: 'Question 4' },
      { id: 'q5', text: 'Question 5' },
    ];

    it('returns an array with the same length as the input', () => {
      const shuffled = shuffleQuestions(mockQuestions);
      expect(shuffled).toHaveLength(mockQuestions.length);
    });

    it('preserves all question objects', () => {
      const shuffled = shuffleQuestions(mockQuestions);
      expect(shuffled.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
        [...mockQuestions].sort((a, b) => a.id.localeCompare(b.id))
      );
    });

    it('does not mutate the original array', () => {
      const originalCopy = JSON.parse(JSON.stringify(mockQuestions));
      shuffleQuestions(mockQuestions);
      expect(mockQuestions).toEqual(originalCopy);
    });

    it('shuffles the questions order', () => {
      let hasShuffled = false;
      for (let i = 0; i < 20; i++) {
        const shuffled = shuffleQuestions(mockQuestions);
        if (JSON.stringify(shuffled.map(q => q.id)) !== JSON.stringify(mockQuestions.map(q => q.id))) {
          hasShuffled = true;
          break;
        }
      }
      expect(hasShuffled).toBe(true);
    });
  });

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

    it('updates correctAnswerIndex to point to the shuffled position of the correct answer', () => {
      const shuffled = shuffleQuestionAnswers(mockQuestion);

      const originalCorrectAnswer = mockQuestion.answers[mockQuestion.correctAnswerIndex];
      
      // The new correctAnswerIndex should point to where the original correct answer ended up
      expect(shuffled.answers[shuffled.correctAnswerIndex]).toBe(originalCorrectAnswer);
      // And the index should reflect the new position
      expect(shuffled.correctAnswerIndex).toBeGreaterThanOrEqual(0);
      expect(shuffled.correctAnswerIndex).toBeLessThan(shuffled.answers.length);
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

    it('returns a new object (not the same reference)', () => {
      const shuffled = shuffleQuestionAnswers(mockQuestion);
      expect(shuffled).not.toBe(mockQuestion);
    });

    it('returns a new answers array (not the same reference)', () => {
      const shuffled = shuffleQuestionAnswers(mockQuestion);
      expect(shuffled.answers).not.toBe(mockQuestion.answers);
    });

    it('preserves other question properties', () => {
      const shuffled = shuffleQuestionAnswers(mockQuestion);
      expect(shuffled.id).toBe(mockQuestion.id);
      expect(shuffled.text).toBe(mockQuestion.text);
    });

    it('maintains correct answer reference across multiple shuffles', () => {
      for (let i = 0; i < 50; i++) {
        const shuffled = shuffleQuestionAnswers(mockQuestion);
        const originalCorrectAnswer = mockQuestion.answers[mockQuestion.correctAnswerIndex];
        const shuffledCorrectAnswer = shuffled.answers[shuffled.correctAnswerIndex];
        expect(shuffledCorrectAnswer).toBe(originalCorrectAnswer);
      }
    });

    it('handles a question with only one answer', () => {
      const singleAnswerQuestion = {
        id: 'q2',
        text: 'Is this a question?',
        answers: ['Yes'],
        correctAnswerIndex: 0
      };
      const shuffled = shuffleQuestionAnswers(singleAnswerQuestion);
      expect(shuffled.answers).toEqual(['Yes']);
      expect(shuffled.correctAnswerIndex).toBe(0);
    });

    it('handles a question with two answers', () => {
      const twoAnswerQuestion = {
        id: 'q3',
        text: 'True or False?',
        answers: ['True', 'False'],
        correctAnswerIndex: 0
      };
      const shuffled = shuffleQuestionAnswers(twoAnswerQuestion);
      const originalCorrectAnswer = twoAnswerQuestion.answers[twoAnswerQuestion.correctAnswerIndex];
      expect(shuffled.answers[shuffled.correctAnswerIndex]).toBe(originalCorrectAnswer);
      expect(shuffled.answers.sort()).toEqual(['False', 'True']);
    });
  });
});
