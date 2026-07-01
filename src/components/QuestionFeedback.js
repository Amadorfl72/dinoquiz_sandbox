import React, { useEffect } from 'react';
import analytics from '../analytics/service';

const QuestionFeedback = ({ dinosaurId, factId, factText, onNext }) => {
  useEffect(() => {
    // Log fun fact viewed when component mounts
    analytics.logFunFactViewed(dinosaurId, factId);
    
    const timer = setTimeout(() => {
      onNext();
    }, 4000); // Auto-advance after 4 seconds
    
    return () => clearTimeout(timer);
  }, [dinosaurId, factId, onNext]);

  return (
    <div className="question-feedback">
      <h3>¡Dato Curioso!</h3>
      <p>{factText}</p>
      <button onClick={onNext}>Siguiente</button>
    </div>
  );
};

export default QuestionFeedback;