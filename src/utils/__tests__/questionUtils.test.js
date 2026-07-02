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
    { 
      id: 3, 
      text: 'Which dinosaur is known for its long neck?', 
      options: [
        { id: 'q3_o1', text: 'Brachiosaurus', isCorrect: true },
        { id: 'q3_o2', text: 'T-Rex', isCorrect: false },
        { id: 'q3_o3', text: 'Stegosaurus', isCorrect: false }
      ] 
    },
    { 
      id: 4, 
      text: 'Which dinosaur had a club on its tail?', 
      options: [
        { id: 'q4_o1', text: 'Ankylosaurus', isCorrect: true },
        { id: 'q4_o2', text: 'Pterodactyl', isCorrect: false },
        { id: 'q4_o3', text: 'Diplodocus', isCorrect: false }
      ] 
    },
    { 
      id: 5, 
      text: 'Which dinosaur is known for its sail on its back?', 
      options: [
        { id: 'q5_o1', text: 'Spinosaurus', isCorrect: true },
        { id: 'q5_o2', text: 'Allosaurus', isCorrect: false },
        { id: 'q5_o3', text: 'Iguanodon', isCorrect: false }
      ] 
    },
  ];

  describe('selectRandomQuestions', () => {
    it('should return the specified number of questions', () => {
      const selected = selectRandomQuestions(mockQuestions, 2);
      expect(selected.length).toBe(2);
    });

    it('should not repeat questions', () => {
      const selected = selectRandomQuestions(mockQuestions, 3);
      const uniqueIds = new Set(selected.map(q => q.id));
      expect(uniqueIds.size).toBe(selected.length);
    });

    it('should default to 10 questions when no count is provided', () => {
      const largePool = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        text: `Question ${i + 1}`,
        options: [
          { id: `q${i + 1}_o1`, text: 'A', isCorrect: true },
          { id: `q${i + 1}_o2`, text: 'B', isCorrect: false },
          { id: `q${i + 1}_o3`, text: 'C', isCorrect: false },
        ],
      }));
      const selected = selectRandomQuestions(largePool);
      expect(selected.length).toBe(10);
    });

    it('should not mutate the original array', () => {
      const originalLength = mockQuestions.length;
      selectRandomQuestions(mockQuestions, 3);
      expect(mockQuestions.length).toBe(originalLength);
    });

    it('should return a new array reference', () => {
      const selected = selectRandomQuestions(mockQuestions, 2);
      expect(selected).not.toBe(mockQuestions);
    });

    it('should handle requesting more questions than available without repetition', () => {
      const selected = selectRandomQuestions(mockQuestions, 10);
      expect(selected.length).toBe(mockQuestions.length);
      const uniqueIds = new Set(selected.map(q => q.id));
      expect(uniqueIds.size).toBe(selected.length);
    });

    it('should return an empty array when the pool is empty', () => {
      const selected = selectRandomQuestions([], 5);
      expect(selected.length).toBe(0);
    });
  });

  describe('shuffleQuestionOptions', () => {
    it('should return a question with the same number of options', () => {
      const originalQuestion = mockQuestions[0];
      const shuffledQuestion = shuffleQuestionOptions(originalQuestion);
      expect(shuffledQuestion.options.length).toBe(originalQuestion.options.length);
    });

    it('should contain the same options as the original question', () => {
      const originalQuestion = mockQuestions[0];
      const shuffledQuestion = shuffleQuestionOptions(originalQuestion);
      
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

    it('should not mutate the original question object', () => {
      const originalQuestion = mockQuestions[0];
      const originalOptionsCopy = JSON.parse(JSON.stringify(originalQuestion.options));
      
      shuffleQuestionOptions(originalQuestion);
      
      expect(originalQuestion.options).toEqual(originalOptionsCopy);
    });

    it('should return a new question object (not the same reference)', () => {
      const originalQuestion = mockQuestions[0];
      const shuffledQuestion = shuffleQuestionOptions(originalQuestion);
      expect(shuffledQuestion).not.toBe(originalQuestion);
    });

    it('should return a new options array (not the same reference)', () => {
      const originalQuestion = mockQuestions[0];
      const shuffledQuestion = shuffleQuestionOptions(originalQuestion);
      expect(shuffledQuestion.options).not.toBe(originalQuestion.options);
    });

    it('should preserve question id and text', () => {
      const originalQuestion = mockQuestions[0];
      const shuffledQuestion = shuffleQuestionOptions(originalQuestion);
      expect(shuffledQuestion.id).toBe(originalQuestion.id);
      expect(shuffledQuestion.text).toBe(originalQuestion.text);
    });
  });

  describe('prepareQuestionsForGame', () => {
    it('should return the specified number of questions with shuffled options', () => {
      const preparedQuestions = prepareQuestionsForGame(mockQuestions, 3);
      expect(preparedQuestions.length).toBe(3);
      
      const uniqueIds = new Set(preparedQuestions.map(q => q.id));
      expect(uniqueIds.size).toBe(preparedQuestions.length);
      
      preparedQuestions.forEach(question => {
        const originalQuestion = mockQuestions.find(q => q.id === question.id);
        const originalTexts = originalQuestion.options.map(o => o.text).sort();
        const shuffledTexts = question.options.map(o => o.text).sort();
        expect(shuffledTexts).toEqual(originalTexts);
      });
    });

    it('should default to 10 questions when no count is provided', () => {
      const largePool = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        text: `Question ${i + 1}`,
        options: [
          { id: `q${i + 1}_o1`, text: 'A', isCorrect: true },
          { id: `q${i + 1}_o2`, text: 'B', isCorrect: false },
          { id: `q${i + 1}_o3`, text: 'C', isCorrect: false },
        ],
      }));
      const prepared = prepareQuestionsForGame(largePool);
      expect(prepared.length).toBe(10);
    });

    it('should not contain duplicate questions', () => {
      const preparedQuestions = prepareQuestionsForGame(mockQuestions, 4);
      const ids = preparedQuestions.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(preparedQuestions.length);
    });

    it('should preserve the correct answer flag in each prepared question', () => {
      const preparedQuestions = prepareQuestionsForGame(mockQuestions, 3);
      preparedQuestions.forEach(question => {
        const originalQuestion = mockQuestions.find(q => q.id === question.id);
        const originalCorrect = originalQuestion.options.find(o => o.isCorrect);
        const shuffledCorrect = question.options.find(o => o.isCorrect);
        expect(shuffledCorrect.text).toBe(originalCorrect.text);
      });
    });

    it('should not mutate the original pool', () => {
      const originalPoolCopy = JSON.parse(JSON.stringify(mockQuestions));
      prepareQuestionsForGame(mockQuestions, 3);
      expect(mockQuestions).toEqual(originalPoolCopy);
    });
  });
});
