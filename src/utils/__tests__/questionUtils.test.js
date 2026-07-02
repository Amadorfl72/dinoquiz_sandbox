import { selectRandomQuestions, shuffleQuestionOptions, prepareQuestionsForGame } from '../questionUtils';

describe('questionUtils', () => {
  const mockQuestions = [
    { 
      id: 1, 
      text: 'What is the T-Rex known for?', 
      options: [
        { id: 'q1_o1', text: 'Big arms', isCorrect: false },
        { id: 'q1_o2', text: 'Sharp teeth', isCorrect: true },
        { id: 'q1_o3', text: 'Long neck', isCorrect: false }
      ] 
    },
    { 
      id: 2, 
      text: 'Which dinosaur had three horns?', 
      options: [
        { id: 'q2_o1', text: 'Stegosaurus', isCorrect: false },
        { id: 'q2_o2', text: 'Triceratops', isCorrect: true },
        { id: 'q2_o3', text: 'Velociraptor', isCorrect: false }
      ] 
    },
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

  describe('shuffleQuestionOptions', () => {
    it('should return a question with shuffled options', () => {
      const originalQuestion = mockQuestions[0];
      const shuffledQuestion = shuffleQuestionOptions(originalQuestion);
      
      expect(shuffledQuestion.options).not.toEqual(originalQuestion.options);
      
      const originalTexts = originalQuestion.options.map(o => o.text).sort();
      const shuffledTexts = shuffledQuestion.options.map(o => o.text).sort();
      expect(shuffledTexts).toEqual(originalTexts);
    });

    it('should preserve the correct answer flag', () => {
      const originalQuestion = mockQuestions[0];
      const shuffledQuestion = shuffleQuestionOptions(originalQuestion);
      
      const originalCorrect = originalQuestion.options.find(o => o.isCorrect);
      const shuffledCorrect = shuffledQuestion.options.find(o => o.isCorrect);
      
      expect(shuffledCorrect.text).toBe(originalCorrect.text);
    });
  });

  describe('prepareQuestionsForGame', () => {
    it('should return the specified number of questions with shuffled options', () => {
      const preparedQuestions = prepareQuestionsForGame(mockQuestions, 2);
      expect(preparedQuestions.length).toBe(2);
      
      const uniqueIds = new Set(preparedQuestions.map(q => q.id));
      expect(uniqueIds.size).toBe(preparedQuestions.length);
      
      preparedQuestions.forEach(question => {
        const originalQuestion = mockQuestions.find(q => q.id === question.id);
        const originalTexts = originalQuestion.options.map(o => o.text).sort();
        const shuffledTexts = question.options.map(o => o.text).sort();
        expect(shuffledTexts).toEqual(originalTexts);
      });
    });
  });
});