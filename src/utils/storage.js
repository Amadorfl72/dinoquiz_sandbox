import AsyncStorage from '@react-native-async-storage/async-storage';

const BEST_SCORE_KEY = 'bestScore';

export const getBestScore = async () => {
  try {
    const value = await AsyncStorage.getItem(BEST_SCORE_KEY);
    return value !== null ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('Error retrieving best score:', error);
    return 0;
  }
};

export const setBestScore = async (score) => {
  try {
    const currentBestScore = await getBestScore();
    if (score > currentBestScore) {
      await AsyncStorage.setItem(BEST_SCORE_KEY, score.toString());
    }
  } catch (error) {
    console.error('Error setting best score:', error);
  }
};