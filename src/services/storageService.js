import { logStorageFailure } from '../utils/logger';

const saveBestScore = async (score) => {
  try {
    // Logic to save the best score
  } catch (error) {
    logStorageFailure('saveBestScore', error.name, process.env.APP_VERSION);
  }
};

export { saveBestScore };