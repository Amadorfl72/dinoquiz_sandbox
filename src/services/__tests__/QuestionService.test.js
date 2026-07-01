import QuestionService from '../QuestionService';

describe('QuestionService', () => {
  it('should load and validate questions on startup', () => {
    expect(() => QuestionService).not.toThrow();
  });

  it('should throw error for invalid questions bank', () => {
    const originalQuestions = QuestionService.questions;
    QuestionService.questions = [];
    expect(() => QuestionService.validateQuestions()).toThrow('must be a non-empty array');
    QuestionService.questions = originalQuestions;
  });

  it('should return 10 random questions by default', () => {
    const questions = QuestionService.getRandomQuestions();
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map(q => q.id)).size).toBe(10); // No duplicates
  });

  it('should throw if requesting more questions than available', () => {
    expect(() => QuestionService.getRandomQuestions(100)).toThrow();
  });
});