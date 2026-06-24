import {
  shuffleArray,
  selectRandomQuestions,
  prepareQuestionForDisplay,
  generateGameSession,
  Question,
} from './quizUtils';

const mockQuestions: Question[] = Array.from({ length: 30 }, (_, i) => ({
  id: `q${i + 1}`,
  statement: `Question ${i + 1}`,
  options: [`Option A`, `Option B`, `Option C`],
  correctAnswerIndex: i % 3,
  dinosaurId: `dino${i + 1}`,
  funFact: `Fact ${i + 1}`,
  imageUrl: `img${i + 1}.png`,
}));

describe('quizUtils', () => {
  it('should shuffle array and return same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(arr.length);
    expect(shuffled.sort((a, b) => a - b)).toEqual(arr);
  });

  it('should select exactly 10 random questions without repetition', () => {
    const selected = selectRandomQuestions(mockQuestions, 10);
    const ids = selected.map(q => q.id);
    expect(selected).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });

  it('should throw if selecting more questions than available', () => {
    expect(() => selectRandomQuestions(mockQuestions, 31)).toThrow();
  });

  it('should shuffle options and update correct answer index', () => {
    const question = mockQuestions[0];
    const prepared = prepareQuestionForDisplay(question);
    
    expect(prepared.options).toHaveLength(3);
    expect(prepared.options).toEqual(expect.arrayContaining(question.options));
    expect(prepared.options[prepared.correctAnswerIndex]).toBe(question.options[question.correctAnswerIndex]);
  });

  it('should generate a game session with 10 prepared questions', () => {
    const session = generateGameSession(mockQuestions);
    expect(session).toHaveLength(10);
    const ids = session.map(q => q.id);
    expect(new Set(ids).size).toBe(10);
  });
});
