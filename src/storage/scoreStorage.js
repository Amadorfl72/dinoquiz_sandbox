export async function setBestScore(score) {
  try {
    // Implementation of storing the best score
    // This might use AsyncStorage, IndexedDB, or similar
  } catch (err) {
    throw new Error('Storage failure');
  }
}

export async function getBestScore() {
  // Implementation of retrieving the best score
}