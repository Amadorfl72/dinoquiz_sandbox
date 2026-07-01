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
          },
          totalAttempts: 1
        }
      },
      {
        $match: { totalAttempts: { $gte: 10 } } // Only consider questions with sufficient data
      },
      {
        $sort: { accuracy: 1 } // Sort by accuracy ascending (worst first)
      },
      {
        $limit: 5
      }
    ];

    const result = await db.collection('analytics').aggregate(pipeline).toArray();
    return result.length <= 5 ? result : result.slice(0, 5); // Ensure we never return more than 5
  } catch (error) {
    console.error('Error fetching top 5 worst performing questions:', error);
    throw error;
  }
};

export { getTop5WorstPerformingQuestions };