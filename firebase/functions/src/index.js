const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const calculateHitPercentage = functions.https.onCall(async (data, context) => {
  const { questionId } = data;
  
  const snapshot = await admin.firestore()
    .collection('question_events')
    .where('question_id', '==', questionId)
    .get();

  const total = snapshot.size;
  const hits = snapshot.docs.filter(doc => doc.data().is_hit).length;
  
  return {
    hitPercentage: total > 0 ? (hits / total) * 100 : 0
  };
});

const checkForDropOffAlerts = functions.https.onCall(async (data, context) => {
  const questionsSnapshot = await admin.firestore()
    .collection('questions')
    .get();

  const alerts = [];
  
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
    
    if (hitPercentage < 40) {
      alerts.push({
        questionId,
        questionText: questionData.text,
        metric: 'hit_percentage',
        value: hitPercentage,
        threshold: 40
      });
    }
    
    // Drop-off calculation would require session tracking
    // This is a simplified version
    const nextQuestionEvents = await admin.firestore()
      .collection('question_events')
      .where('previous_question_id', '==', questionId)
      .get();
    
    const dropOffPercentage = ((totalAnswered - nextQuestionEvents.size) / totalAnswered) * 100;
    
    if (dropOffPercentage > 5) {
      alerts.push({
        questionId,
        questionText: questionData.text,
        metric: 'drop_off_percentage',
        value: dropOffPercentage,
        threshold: 5
      });
    }
  }
  
  return { alerts };
});

module.exports = {
  calculateHitPercentage,
  checkForDropOffAlerts
};