const { DEFAULT_STATE } = require('./types');
const { createIndexedDbAdapter } = require('./adapters/indexedDbAdapter');
const { createLocalStorageAdapter } = require('./adapters/localStorageAdapter');
const { createMemoryAdapter } = require('./adapters/memoryAdapter');
const { DinoQuizStorage } = require('./StorageClient');
const { GameSessionStorage, SESSION_SCHEMA_VERSION, SESSION_STORAGE_KEY } = require('./GameSessionStorage');
const {
  ModeProgressStorage,
  MODE_PROGRESS_SCHEMA_VERSION,
  MODE_PROGRESS_KEY_PREFIX,
  MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE,
} = require('./ModeProgressStorage');

/** Shared instance for the rest of the app to import directly. */
const dinoQuizStorage = new DinoQuizStorage();

/** Shared instance for the rest of the app to import directly (TRIOFSND-242). */
const gameSessionStorage = new GameSessionStorage();

/** Shared instance for the rest of the app to import directly (TRIOFSND-250). */
const modeProgressStorage = new ModeProgressStorage();

module.exports = {
  DEFAULT_STATE,
  createIndexedDbAdapter,
  createLocalStorageAdapter,
  createMemoryAdapter,
  DinoQuizStorage,
  dinoQuizStorage,
  GameSessionStorage,
  gameSessionStorage,
  SESSION_SCHEMA_VERSION,
  SESSION_STORAGE_KEY,
  ModeProgressStorage,
  modeProgressStorage,
  MODE_PROGRESS_SCHEMA_VERSION,
  MODE_PROGRESS_KEY_PREFIX,
  MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE,
};
