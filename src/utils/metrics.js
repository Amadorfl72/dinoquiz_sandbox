import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './analytics';

const functions = getFunctions(app);

const getQuestionMetrics = httpsCallable(functions, 'getQuestionMetrics');
const getDropOffAlerts = httpsCallable(functions, 'getDropOffAlerts');

const calculateHitPercentage = async (questionId) => {
  try {
    const result = await getQuestionMetrics({ questionId });
    return result.data.hitPercentage;
  } catch (error) {
    console.error('Error calculating hit percentage:', error);
    return null;
  }
};

const checkForDropOffAlerts = async () => {
  try {
    const result = await getDropOffAlerts();
    return result.data.alerts;
  } catch (error) {
    console.error('Error checking for drop-off alerts:', error);
    return [];
  }
};

export { calculateHitPercentage, checkForDropOffAlerts };