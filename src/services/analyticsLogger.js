export const logFunFactViewed = (questionId, dinoId) => {
  console.log('[Analytics]', {
    event: 'fun_fact_viewed',
    question_id: questionId,
    dino_id: dinoId,
    timestamp: new Date().toISOString()
  });
};