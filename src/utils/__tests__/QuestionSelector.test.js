import QuestionSelector from '../QuestionSelector';

describe('QuestionSelector', () => {
  const mockQuestions = [
    { id: 1, text: 'Question 1' },
    { id: 2, text: 'Question 2' },
    { id: 3, text: 'Question 3' },
    { id: 4, text: 'Question 4' },
    { id: 5, text: 'Question 5' },
  ];

  it('should throw error when initialized with empty array', () => {
    expect(() => new QuestionSelector([])).toThrow('Questions must be a non-empty array');
  });

  it('should throw error when count is not positive number', () => {
    const selector = new QuestionSelector(mockQuestions);
    expect(() => selector.getRandomQuestions(0)).toThrow('Count must be a positive number');
    expect(() => selector.getRandomQuestions(-1)).toThrow('Count must be a positive number');
    expect(() => selector.getRandomQuestions('invalid')).toThrow('Count must be a positive number');
  });

  it('should select random questions without repetition', () => {
    const selector = new QuestionSelector(mockQuestions);
    const selected = selector.getRandomQuestions(3);
    expect(selected.length).toBe(3);
    expect(new Set(selected).size).toBe(3);
  });

  it('should reset used questions when not enough available', () => {
    const selector = new QuestionSelector(mockQuestions);
    selector.getRandomQuestions(5);
    const selected = selector.getRandomQuestions(3);
    expect(selected.length).toBe(3);
  });

  it('should throw error if not enough questions', () => {
    const selector = new QuestionSelector(mockQuestions);
    expect(() => selector.getRandomQuestions(6)).toThrow('Not enough questions available');
  });
});