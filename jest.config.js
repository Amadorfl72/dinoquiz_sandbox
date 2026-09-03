/** DinoQuiz test config — jsdom for a browser PWA. Tests live next to the
 *  code they cover (src/**, or public/scripts/** for the no-bundler screen/
 *  service implementations that live there) or under tests/. Kept minimal
 *  on purpose: the pipeline's QA stage runs `npm test` against this. */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/public/scripts/**/*.test.js',
    '<rootDir>/tests/**/*.test.js',
  ],
  collectCoverage: false,
};
