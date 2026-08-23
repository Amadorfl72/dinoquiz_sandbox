const { DEFAULT_STATE } = require('./types');
const { createIndexedDbAdapter } = require('./adapters/indexedDbAdapter');
const { createLocalStorageAdapter } = require('./adapters/localStorageAdapter');
const { createMemoryAdapter } = require('./adapters/memoryAdapter');
const { DinoQuizStorage, REPLAY_PULSADO_EVENT, PARTIDA_INICIADA_EVENT } = require('./StorageClient');
const { normalizeCounter } = require('./normalizeCounter');

/** Shared instance for the rest of the app to import directly. */
const dinoQuizStorage = new DinoQuizStorage();

module.exports = {
  DEFAULT_STATE,
  createIndexedDbAdapter,
  createLocalStorageAdapter,
  createMemoryAdapter,
  DinoQuizStorage,
  dinoQuizStorage,
  normalizeCounter,
  REPLAY_PULSADO_EVENT,
  PARTIDA_INICIADA_EVENT,
};
