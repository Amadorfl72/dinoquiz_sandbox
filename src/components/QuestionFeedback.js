import React from 'react';
import { logFunFactViewed } from '../analytics/logger';

const QuestionFeedback = ({ questionId, dinoId, appVersion, funFact }) => {
  // Log when the fun fact is displayed
  React.useEffect(() => {
    logFunFactViewed(questionId, dinoId, appVersion);
  }, [questionId, dinoId, appVersion]);

  return (
    <div className="fun-fact">
      <h3>¡Dato curioso!</h3>
      <p>{funFact}</p>
    </div>
  );
};

export default QuestionFeedback;