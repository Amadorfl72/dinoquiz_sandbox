const { DEFAULT_STATE } = require('./types');
const { createIndexedDbAdapter } = require('./adapters/indexedDbAdapter');
const { createLocalStorageAdapter } = require('./adapters/localStorageAdapter');
const { createMemoryAdapter } = require('./adapters/memoryAdapter');
const { DinoQuizStorage } = require('./StorageClient');

/** Shared instance for the rest of the app to import directly. */
const dinoQuizStorage = new DinoQuizStorage();

module.exports = {
  DEFAULT_STATE,
  createIndexedDbAdapter,
  createLocalStorageAdapter,
  createMemoryAdapter,
  DinoQuizStorage,
  dinoQuizStorage,
};
