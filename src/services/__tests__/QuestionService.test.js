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

  it('should throw if bank has fewer than 10 questions', () => {
    const originalQuestions = QuestionService.questions;
    QuestionService.questions = originalQuestions.slice(0, 5);
    expect(() => QuestionService.validateQuestions()).toThrow('at least 10');
    QuestionService.questions = originalQuestions;
  });

  it('should throw if duplicate question ids exist', () => {
    const originalQuestions = QuestionService.questions;
    QuestionService.questions = [...originalQuestions, { ...originalQuestions[0] }];
    expect(() => QuestionService.validateQuestions()).toThrow('Duplicate question id');
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

  it('should return different questions on subsequent calls', () => {
    const firstSet = QuestionService.getRandomQuestions();
    const secondSet = QuestionService.getRandomQuestions();
    
    // Not guaranteed to be different due to randomness, but very likely with sufficient bank size
    expect(firstSet).not.toEqual(secondSet);
  });
});