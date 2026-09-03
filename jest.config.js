/** DinoQuiz test config — jsdom for a browser PWA. Tests live next to the
 *  code they cover (src/**, public/scripts/**) or under tests/. Kept minimal
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
