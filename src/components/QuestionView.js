import React, { useEffect } from 'react';
import Logger from '../analytics/logger';

const QuestionView = ({ question, onAnswerSelected }) => {
  const { id, dinosaurId, funFact } = question;

  useEffect(() => {
    // Log when fun fact is displayed
    const timer = setTimeout(() => {
      Logger.logFunFactViewed(dinosaurId, funFact.id);
    }, 4000); // After 4 seconds of displaying the fun fact

    return () => clearTimeout(timer);
  }, [dinosaurId, funFact.id]);

  return (
    <div className="question-view">
      {/* Question rendering logic */}
    </div>
  );
};

export default QuestionView;