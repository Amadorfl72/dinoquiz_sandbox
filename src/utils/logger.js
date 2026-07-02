import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

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
const analytics = getAnalytics(app);

const Logger = {
  logGameStarted: (questionIds) => {
    logEvent(analytics, 'partida_iniciada', {
      timestamp: new Date().toISOString(),
      question_ids: questionIds.slice(0, 10) // Log first 10 question IDs
    });
  },

  logQuestionAnswered: (questionId, isHit, responseTimeMs) => {
    logEvent(analytics, 'pregunta_respondida', {
      question_id: questionId,
      is_hit: isHit,
      response_time_ms: responseTimeMs
    });
  },

  logBankValidation: (isValid, error) => {
    logEvent(analytics, 'bank_validation', {
      is_valid: isValid,
      error: error || null
    });
  }
};

export default Logger;