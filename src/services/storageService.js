import * as storageService from './storageService';
import { logStructured } from '../utils/logger';
import { appVersion } from '../config';

const STORAGE_KEY = 'dinoquiz_state';

const _persist = async (data) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const _load = async () => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

const _clear = async () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

const logStorageFailure = (operation, error) => {
  logStructured({
    event: 'storage_failure',
    operation,
    error_type: (error && error.name) || 'Error',
    app_version: appVersion,
  });
};

const save = async (data) => {
  try {
    await storageService._persist(data);
  } catch (error) {
    logStorageFailure('save', error);
    throw error;
  }
};

const load = async () => {
  try {
    return await storageService._load();
  } catch (error) {
    logStorageFailure('load', error);
    throw error;
  }
};

const clear = async () => {
  try {
    await storageService._clear();
  } catch (error) {
    logStorageFailure('clear', error);
    throw error;
  }
};

export { save, load, clear, _persist, _load, _clear };
