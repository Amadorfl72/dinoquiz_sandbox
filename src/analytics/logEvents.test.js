import { logQuestionAnswered, logFeedbackShown } from './logEvents';

describe('logEvents', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs question answered with correct structure', () => {
    logQuestionAnswered('q1', true, 500);
    expect(consoleSpy).toHaveBeenCalledWith('question_answered', {
      question_id: 'q1',
      success: true,
      time_to_answer_ms: 500
    });
  });

  it('logs feedback shown with correct structure', () => {
    logFeedbackShown('q2');
    expect(consoleSpy).toHaveBeenCalledWith('feedback_shown', { question_id: 'q2' });
  });
});
