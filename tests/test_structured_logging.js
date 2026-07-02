import { logAppOpen, logGameStarted } from '../src/utils/logger';
import { version } from '../package.json';

describe('Structured Logging', () => {
  let consoleLogSpy;
  let originalLanguage;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalLanguage = navigator.language;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(navigator, 'language', {
      value: originalLanguage,
      configurable: true,
    });
  });

  test('app_open event structure', () => {
    const logEntry = logAppOpen();

    expect(logEntry.event).toBe('app_open');
    expect(logEntry).toHaveProperty('timestamp');
    expect(logEntry).toHaveProperty('app_version');
    expect(logEntry).toHaveProperty('locale');

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(logEntry));
  });

  test('game_started event structure', () => {
    const logEntry = logGameStarted();

    expect(logEntry.event).toBe('game_started');
    expect(logEntry).toHaveProperty('timestamp');
    expect(logEntry).toHaveProperty('app_version');
    expect(logEntry).toHaveProperty('locale');

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(logEntry));
  });

  test('timestamp is valid ISO format', () => {
    const logEntry = logAppOpen();
    expect(() => new Date(logEntry.timestamp)).not.toThrow();
    expect(logEntry.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  test('output is valid JSON', () => {
    logAppOpen();
    const logCall = consoleLogSpy.mock.calls[0][0];
    expect(() => JSON.parse(logCall)).not.toThrow();
  });

  test('app_version matches package.json version', () => {
    const logEntry = logAppOpen();
    expect(logEntry.app_version).toBe(version);
  });

  test('game_started app_version matches package.json version', () => {
    const logEntry = logGameStarted();
    expect(logEntry.app_version).toBe(version);
  });

  test('locale uses navigator.language when available', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });

    const logEntry = logAppOpen();
    expect(logEntry.locale).toBe('en-US');
  });

  test('locale falls back to es when navigator.language is undefined', () => {
    Object.defineProperty(navigator, 'language', {
      value: undefined,
      configurable: true,
    });

    const logEntry = logGameStarted();
    expect(logEntry.locale).toBe('es');
  });

  test('logAppOpen returns the log entry object', () => {
    const logEntry = logAppOpen();
    expect(typeof logEntry).toBe('object');
    expect(logEntry).not.toBeNull();
  });

  test('logGameStarted returns the log entry object', () => {
    const logEntry = logGameStarted();
    expect(typeof logEntry).toBe('object');
    expect(logEntry).not.toBeNull();
  });

  test('logAppOpen logs exactly once', () => {
    logAppOpen();
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  test('logGameStarted logs exactly once', () => {
    logGameStarted();
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  test('log entry contains exactly the expected keys for app_open', () => {
    const logEntry = logAppOpen();
    expect(Object.keys(logEntry).sort()).toEqual(
      ['app_version', 'event', 'locale', 'timestamp'].sort()
    );
  });

  test('log entry contains exactly the expected keys for game_started', () => {
    const logEntry = logGameStarted();
    expect(Object.keys(logEntry).sort()).toEqual(
      ['app_version', 'event', 'locale', 'timestamp'].sort()
    );
  });

  test('logged JSON string matches returned object', () => {
    const logEntry = logAppOpen();
    const loggedString = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedString);
    expect(parsed).toEqual(logEntry);
  });
});
