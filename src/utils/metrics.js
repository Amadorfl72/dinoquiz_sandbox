import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './analytics';

const functions = getFunctions(app);

const getCurrentAlerts = httpsCallable(functions, 'getCurrentAlerts');

const getAlerts = async () => {
  try {
    const result = await getCurrentAlerts();
    return result.data.alerts;
  } catch (error) {
    console.error('Error getting alerts:', error);
    return [];
  }
};

export { getAlerts as getCurrentAlerts };