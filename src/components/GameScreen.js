import { useEffect, useState } from 'react';
import Logger from '../utils/logger';
import Metrics from '../utils/metrics';

export default function GameScreen({ questions }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);
  
  useEffect(() => {
    // Log game started with first 10 question IDs
    const questionIds = questions.map(q => q.id).slice(0, 10);
    Logger.logGameStarted(questionIds);
    setStartTime(Date.now());
  }, [questions]);

  const handleAnswer = (questionId, isCorrect) => {
    const responseTime = Date.now() - startTime;
    
    // Log the answered question
    Logger.logQuestionAnswered(questionId, isCorrect, responseTime);
    
    // Track performance metrics
    Metrics.trackQuestionPerformance(questionId, isCorrect);
    Metrics.trackDropOffRate(questionId, false);
    
    // Move to next question or end game
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setStartTime(Date.now());
    } else {
      // Game completed
    }
  };

  // ... rest of the component code
}