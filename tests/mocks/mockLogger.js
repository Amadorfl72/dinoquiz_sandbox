const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  reset() {
    this.info.mockClear();
    this.warn.mockClear();
    this.error.mockClear();
    this.debug.mockClear();
  },
};

module.exports = mockLogger;
