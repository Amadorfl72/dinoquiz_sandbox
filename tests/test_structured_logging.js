import { logAppOpen, logGameStarted } from '../src/utils/logger';

describe('Structured Logging', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('app_open event structure', () => {
    const logEntry = logAppOpen();
    
    expect(logEntry.event).toBe('app_open');
    expect(logEntry).toHaveProperty('timestamp');
    expect(logEntry).toHaveProperty('app_version');
    expect(logEntry).toHaveProperty('locale');
    
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(logEntry));
  });

  test('game_started event structure', () => {
    const logEntry = logGameStarted();
    
    expect(logEntry.event).toBe('game_started');
    expect(logEntry).toHaveProperty('timestamp');
    expect(logEntry).toHaveProperty('app_version');
    expect(logEntry).toHaveProperty('locale');
    
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(logEntry));
  });

  test('timestamp is valid ISO format', () => {
    const logEntry = logAppOpen();
    expect(() => new Date(logEntry.timestamp)).not.toThrow();
  });

  test('output is valid JSON', () => {
    logAppOpen();
    const logCall = console.log.mock.calls[0][0];
    expect(() => JSON.parse(logCall)).not.toThrow();
  });
});
