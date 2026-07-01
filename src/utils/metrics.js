import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './analytics';

const functions = getFunctions(app);

const calculateHitPercentage = httpsCallable(functions, 'calculateHitPercentage');
const checkForDropOffAlerts = httpsCallable(functions, 'checkForDropOffAlerts');

const getHitPercentage = async (questionId) => {
  try {
    const result = await calculateHitPercentage({ questionId });
    return result.data.hitPercentage;
  } catch (error) {
    console.error('Error calculating hit percentage:', error);
    return null;
  }
};

const getDropOffAlerts = async () => {
  try {
    const result = await checkForDropOffAlerts();
    return result.data.alerts;
  } catch (error) {
    console.error('Error checking for drop-off alerts:', error);
    return [];
  }
};

export { getHitPercentage, getDropOffAlerts };