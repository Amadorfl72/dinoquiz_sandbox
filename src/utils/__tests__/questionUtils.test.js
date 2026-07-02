import { selectRandomQuestions, shuffleAnswers, prepareQuestionsForGame } from '../questionUtils';

describe('questionUtils', () => {
  const mockQuestions = [
    { id: 1, question: 'What is the T-Rex known for?', answers: ['Big arms', 'Sharp teeth', 'Long neck'], correctAnswer: 'Sharp teeth' },
    { id: 2, question: 'Which dinosaur had three horns?', answers: ['Stegosaurus', 'Triceratops', 'Velociraptor'], correctAnswer: 'Triceratops' },
    // Add more mock questions as needed
  ];

  describe('selectRandomQuestions', () => {
    it('should return the specified number of questions', () => {
      const selected = selectRandomQuestions(mockQuestions, 2);
      expect(selected.length).toBe(2);
    });

    it('should not repeat questions', () => {
      const selected = selectRandomQuestions(mockQuestions, 2);
      const uniqueIds = new Set(selected.map(q => q.id));
      expect(uniqueIds.size).toBe(selected.length);
    });
  });

  describe('shuffleAnswers', () => {
    it('should return a question with shuffled answers', () => {
      const originalQuestion = mockQuestions[0];
      const shuffledQuestion = shuffleAnswers(originalQuestion);
      
      expect(shuffledQuestion.answers).not.toEqual(originalQuestion.answers);
      expect(shuffledQuestion.answers.sort()).toEqual(originalQuestion.answers.sort());
    });
  });

  describe('prepareQuestionsForGame', () => {
    it('should return the specified number of questions with shuffled answers', () => {
      const preparedQuestions = prepareQuestionsForGame(mockQuestions, 2);
      expect(preparedQuestions.length).toBe(2);
      
      const uniqueIds = new Set(preparedQuestions.map(q => q.id));
      expect(uniqueIds.size).toBe(preparedQuestions.length);
      
      preparedQuestions.forEach(question => {
        const originalQuestion = mockQuestions.find(q => q.id === question.id);
        expect(question.answers.sort()).toEqual(originalQuestion.answers.sort());
      });
    });
  });
});