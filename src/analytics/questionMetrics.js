// Aggregation pipeline to fetch top 5 worst performing questions
const getTop5WorstPerformingQuestions = async () => {
  try {
    const pipeline = [
      {
        $match: { event: 'question_answered' }
      },
      {
        $group: {
          _id: '$question_id',
          totalAttempts: { $sum: 1 },
          correctAttempts: {
            $sum: {
              $cond: [{ $eq: ['$is_correct', true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          questionId: '$_id',
          accuracy: {
            $divide: ['$correctAttempts', '$totalAttempts']
          }
        }
      },
      {
        $sort: { accuracy: 1 }
      },
      {
        $limit: 5
      }
    ];

    const result = await db.collection('analytics').aggregate(pipeline).toArray();
    return result;
  } catch (error) {
    console.error('Error fetching top 5 worst performing questions:', error);
    throw error;
  }
};

export { getTop5WorstPerformingQuestions };