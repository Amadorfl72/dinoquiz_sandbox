import { initializeApp } from 'firebase/app';
import { getPerformance } from 'firebase/performance';
import { getFunctions, httpsCallable } from 'firebase/functions';
import alertRules from './alertRules.json';

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
const functions = getFunctions(app);

// Track question performance metrics
const questionStats = {};

const Metrics = {
  trackQuestionPerformance: (questionId, isHit) => {
    if (!questionStats[questionId]) {
      questionStats[questionId] = {
        hits: 0,
        attempts: 0,
        lastHitRate: 0
      };
    }
    
    questionStats[questionId].attempts++;
    if (isHit) questionStats[questionId].hits++;
    
    const hitRate = (questionStats[questionId].hits / questionStats[questionId].attempts) * 100;
    questionStats[questionId].lastHitRate = hitRate;
    
    // Check for low hit rate alert
    if (hitRate < 40) {
      this.triggerAlert('low_hit_rate', {
        question_id: questionId,
        hit_rate: hitRate
      });
    }
  },

  trackDropOffRate: (questionId, isDropOff) => {
    if (!questionStats[questionId]) {
      questionStats[questionId] = {
        dropOffs: 0,
        views: 0,
        lastDropOffRate: 0
      };
    }
    
    questionStats[questionId].views++;
    if (isDropOff) questionStats[questionId].dropOffs++;
    
    const dropOffRate = (questionStats[questionId].dropOffs / questionStats[questionId].views) * 100;
    questionStats[questionId].lastDropOffRate = dropOffRate;
    
    // Check for high drop-off alert
    if (dropOffRate > 5) {
      this.triggerAlert('high_drop_off', {
        question_id: questionId,
        drop_off_rate: dropOffRate
      });
    }
  },

  triggerAlert: (alertType, data) => {
    const alertConfig = alertRules.alerts.find(a => a.name === alertType);
    if (!alertConfig) return;
    
    const sendAlert = httpsCallable(functions, 'sendAlert');
    sendAlert({
      type: alertType,
      config: alertConfig,
      data: data
    }).catch(error => {
      console.error('Error triggering alert:', error);
    });
  },

  setupAlerts: () => {
    // Initialize periodic checks for alert conditions
    setInterval(() => {
      Object.entries(questionStats).forEach(([questionId, stats]) => {
        if (stats.lastHitRate < 40) {
          this.triggerAlert('low_hit_rate', {
            question_id: questionId,
            hit_rate: stats.lastHitRate
          });
        }
        
        if (stats.lastDropOffRate > 5) {
          this.triggerAlert('high_drop_off', {
            question_id: questionId,
            drop_off_rate: stats.lastDropOffRate
          });
        }
      });
    }, 300000); // Check every 5 minutes
  }
};

export default Metrics;