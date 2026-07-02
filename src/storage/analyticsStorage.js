import { getDatabase } from './database';

export const storeAnalyticsEvent = async (eventData) => {
  const db = await getDatabase();
  
  // Store event in IndexedDB
  await db.add('analyticsEvents', eventData);
  
  // Optionally, you could also batch send events periodically
  // to reduce network requests
};
