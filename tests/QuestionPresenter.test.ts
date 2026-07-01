import { QuestionPresenter } from '../src/QuestionPresenter';
import { Question } from '../src/types';

describe('TRIOFSND-17: Implement Option Shuffling', () => {
  const mockQuestion: Question = {
    id: 'q1',
    text: 'What is 2 + 2?',
    options: ['3', '4', '5'],
    correctAnswer: '4'
  };

  let presenter: QuestionPresenter;

  beforeEach(() => {
    presenter = new QuestionPresenter();
  });

  it('should present a question with exactly 3 options', () => {
    const presented = presenter.present(mockQuestion);
    expect(presented.options).toHaveLength(3);
  });

  it('should present a question containing the same options as the original', () => {
    const presented = presenter.present(mockQuestion);
    expect(presented.options).toEqual(expect.arrayContaining(mockQuestion.options));
  });

  it('should randomize the order of options each time a question is presented', () => {
    const presentations: string[][] = [];
    
    // Present the question multiple times to check for randomness
    for (let i = 0; i < 100; i++) {
      presentations.push(presenter.present(mockQuestion).options);
    }
    
    // Check that at least one presentation has a different order than the original
    const hasDifferentOrder = presentations.some(
      opts => JSON.stringify(opts) !== JSON.stringify(mockQuestion.options)
    );
    expect(hasDifferentOrder).toBe(true);

    // Check that there is variation among the presentations themselves
    const uniqueOrders = new Set(presentations.map(opts => JSON.stringify(opts)));
    expect(uniqueOrders.size).toBeGreaterThan(1);
  });

  it('should not mutate the original question object', () => {
    const originalOptionsCopy = [...mockQuestion.options];
    presenter.present(mockQuestion);
    expect(mockQuestion.options).toEqual(originalOptionsCopy);
  });
});