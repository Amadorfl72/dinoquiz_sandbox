import { initializeApp } from 'firebase/app';
import { getPerformance } from 'firebase/performance';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const perf = getPerformance(app);

const Metrics = {
  trackQuestionPerformance: (questionId, isHit) => {
    // This would be configured in Firebase Analytics dashboard
    // to calculate % hit rate per question
  },

  trackDropOffRate: (questionId, isDropOff) => {
    // Configured in Firebase Analytics to track
    // question-to-question drop-off rates
  },

  setupAlerts: () => {
    // Configure alerts in Firebase for:
    // - Drop-off rate >5% for any question
    // - Hit rate <40% for any question
  }
};

export default Metrics;