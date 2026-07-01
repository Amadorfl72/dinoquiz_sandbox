import React, { useEffect } from 'react';
import Logger from '../analytics/logger';

const FUN_FACT_VIEW_DELAY = 4000; // 4 seconds as per requirements

const QuestionView = ({ question, onAnswerSelected }) => {
  const { id, dinosaurId, funFact } = question;

  useEffect(() => {
    // Log when fun fact is displayed
    const timer = setTimeout(() => {
      Logger.logFunFactViewed(dinosaurId, funFact.id);
    }, FUN_FACT_VIEW_DELAY);

    return () => clearTimeout(timer);
  }, [dinosaurId, funFact.id]);

  return (
    <div className="question-view">
      {/* Question rendering logic */}
    </div>
  );
};

export default QuestionView;