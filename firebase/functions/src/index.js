const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Scheduled function to calculate hit percentages for all questions
exports.calculateHitPercentages = functions.pubsub
  .schedule('every 60 minutes from 00:00 to 23:59')
  .timeZone('Etc/UTC')
  .onRun(async (context) => {
    try {
      const questionsSnapshot = await admin.firestore()
        .collection('questions')
        .get();

      for (const questionDoc of questionsSnapshot.docs) {
        const questionId = questionDoc.id;
        
        const eventsSnapshot = await admin.firestore()
          .collection('question_events')
          .where('question_id', '==', questionId)
          .get();

        const total = eventsSnapshot.size;
        const hits = eventsSnapshot.docs.filter(doc => doc.data().is_hit).length;
        
        const hitPercentage = total > 0 ? (hits / total) * 100 : 0;
        
        // Update the question document with the latest hit percentage
        await admin.firestore()
          .collection('questions')
          .doc(questionId)
          .update({
            hit_percentage: hitPercentage,
            last_metrics_update: admin.firestore.FieldValue.serverTimestamp()
          });
      }
      
      console.log('Successfully updated hit percentages for all questions');
      return null;
    } catch (error) {
      console.error('Error calculating hit percentages:', error);
      return null;
    }
  });

// Scheduled function to check for drop-off alerts
exports.checkDropOffAlerts = functions.pubsub
  .schedule('every 30 minutes from 00:00 to 23:59')
  .timeZone('Etc/UTC')
  .onRun(async (context) => {
    try {
      const questionsSnapshot = await admin.firestore()
        .collection('questions')
        .get();

      for (const questionDoc of questionsSnapshot.docs) {
        const questionId = questionDoc.id;
        const questionData = questionDoc.data();
        
        const eventsSnapshot = await admin.firestore()
          .collection('question_events')
          .where('question_id', '==', questionId)
          .get();
        
        const totalAnswered = eventsSnapshot.size;
        
        if (totalAnswered === 0) continue;
        
        const hits = eventsSnapshot.docs.filter(doc => doc.data().is_hit).length;
        const hitPercentage = (hits / totalAnswered) * 100;
        
        // Check hit percentage alert
        if (hitPercentage < 40) {
          await admin.firestore()
            .collection('alerts')
            .add({
              type: 'low_hit_percentage',
              question_id: questionId,
              question_text: questionData.text,
              value: hitPercentage,
              threshold: 40,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Check drop-off alert
        const nextQuestionEvents = await admin.firestore()
          .collection('question_events')
          .where('previous_question_id', '==', questionId)
          .get();
        
        const dropOffPercentage = ((totalAnswered - nextQuestionEvents.size) / totalAnswered) * 100;
        
        if (dropOffPercentage > 5) {
          await admin.firestore()
            .collection('alerts')
            .add({
              type: 'high_drop_off',
              question_id: questionId,
              question_text: questionData.text,
              value: dropOffPercentage,
              threshold: 5,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
      }
      
      console.log('Successfully checked for drop-off alerts');
      return null;
    } catch (error) {
      console.error('Error checking drop-off alerts:', error);
      return null;
    }
  });

// HTTP function to get current alerts (for dashboard)
exports.getCurrentAlerts = functions.https.onCall(async (data, context) => {
  try {
    const snapshot = await admin.firestore()
      .collection('alerts')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const alerts = [];
    snapshot.forEach(doc => {
      alerts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { alerts };
  } catch (error) {
    console.error('Error getting current alerts:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch alerts');
  }
});