export type {
  DinoQuizPersistedState,
  Listener,
  StorageAdapter,
  StorageBackendName,
  StorageDiagnostics,
  StorageKey,
  Unsubscribe,
} from './types';
export { DEFAULT_STATE } from './types';

export { createIndexedDbAdapter } from './adapters/indexedDbAdapter';
export { createLocalStorageAdapter } from './adapters/localStorageAdapter';
export { createMemoryAdapter } from './adapters/memoryAdapter';

export { DinoQuizStorage } from './StorageClient';

import { DinoQuizStorage } from './StorageClient';

/** Shared instance for the rest of the app to import directly. */
export const dinoQuizStorage = new DinoQuizStorage();
