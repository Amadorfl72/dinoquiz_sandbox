const { handleGameResults } = require('../../src/game/GameResults');
const { saveBestScore } = require('../../src/services/storage');

// Mock console.log to capture structured logs
const mockConsoleLog = jest.fn();
console.log = mockConsoleLog;

jest.mock('../../src/services/storage');

const mockLoadBestScore = jest.fn();

saveBestScore.mockImplementation(() => true);

jest.mock('../../src/services/storage', () => ({
  loadBestScore: mockLoadBestScore,
  saveBestScore: jest.requireActual('../../src/services/storage').saveBestScore
}));

describe('TRIOFSND-47: Structured logging for best score updates', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    mockLoadBestScore.mockClear();
  });

  it('emits best_score_updated with new_best, previous_best when a new best is achieved', () => {
    mockLoadBestScore.mockReturnValue(50);
    
    handleGameResults(75);

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    
    expect(logged).toEqual({
      event: 'best_score_updated',
      new_best: 75,
      previous_best: 50,
      app_version: expect.any(String),
      timestamp: expect.any(String)
    });
  });

  it('does not emit best_score_updated when the new score does not exceed the previous best', () => {
    mockLoadBestScore.mockReturnValue(100);
    
    handleGameResults(80);

    expect(mockConsoleLog).not.toHaveBeenCalled();
  });

  it('uses previous_best of 0 when no previous best exists', () => {
    mockLoadBestScore.mockReturnValue(0);
    
    handleGameResults(10);

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    
    expect(logged).toEqual({
      event: 'best_score_updated',
      new_best: 10,
      previous_best: 0,
      app_version: expect.any(String),
      timestamp: expect.any(String)
    });
  });

  it('does not include PII in the best_score_updated log entry', () => {
    mockLoadBestScore.mockReturnValue(5);
    
    handleGameResults(20);

    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    
    expect(logged).not.toHaveProperty('userId');
    expect(logged).not.toHaveProperty('username');
    expect(JSON.stringify(logged)).not.toContain('user-123');
    expect(JSON.stringify(logged)).not.toContain('jane.doe');
  });
});