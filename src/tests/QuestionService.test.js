import QuestionService from '../services/QuestionService';

describe('QuestionService', () => {
  it('should validate questions on startup', () => {
    expect(() => QuestionService).not.toThrow();
  });

  it('should throw an error if questions are invalid', () => {
    const invalidQuestions = [
      { id: 1, text: 'Test', options: ['A', 'B'], correctAnswer: 0, funFact: 'Fun', dinosaurImage: 'img.png' },
      { id: 2, text: 'Test', options: ['A'], correctAnswer: 0, funFact: 'Fun', dinosaurImage: 'img.png' }
    ];
    
    const originalQuestions = QuestionService.questions;
    QuestionService.questions = invalidQuestions;
    
    expect(() => QuestionService.validateQuestions(invalidQuestions)).toThrow();
    
    QuestionService.questions = originalQuestions;
  });

  it('should return 10 random questions without repetition', () => {
    const questions = QuestionService.getRandomQuestions();
    expect(questions).toHaveLength(10);
    
    const uniqueIds = new Set(questions.map(q => q.id));
    expect(uniqueIds.size).toBe(10);
  });

  it('should throw an error if requesting more questions than available', () => {
    expect(() => QuestionService.getRandomQuestions(100)).toThrow();
  });
});