import { getDatabase } from './database';

export const initAnalyticsDB = async () => {
  // Opening the database triggers the `onupgradeneeded` handler in
  // ./database.js, which creates the 'analyticsEvents' object store as part of
  // the version-change transaction. Object stores can only be created there,
  // so we simply ensure the database (and therefore its schema) is open.
  await getDatabase();
};

export const storeAnalyticsEvent = async (eventData) => {
  const db = await getDatabase();
  
  // Store event in IndexedDB
  await db.add('analyticsEvents', eventData);
  
  // Optionally, you could also batch send events periodically
  // to reduce network requests
};