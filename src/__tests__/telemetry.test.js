import { trackReplay, trackGameStart, trackQuestionAnswered, trackGameCompleted } from '../analytics/telemetry';

describe('Telemetry', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs replay event', () => {
    trackReplay();
    expect(console.log).toHaveBeenCalledWith('Telemetry: replay event tracked');
  });

  it('logs game start event', () => {
    trackGameStart();
    expect(console.log).toHaveBeenCalledWith('Telemetry: game start event tracked');
  });

  it('logs question answered event', () => {
    const questionId = '123';
    const isCorrect = true;
    trackQuestionAnswered(questionId, isCorrect);
    expect(console.log).toHaveBeenCalledWith(`Telemetry: question ${questionId} answered, correct: ${isCorrect}`);
  });

  it('logs game completed event', () => {
    const score = 8;
    trackGameCompleted(score);
    expect(console.log).toHaveBeenCalledWith(`Telemetry: game completed with score ${score}`);
  });
});