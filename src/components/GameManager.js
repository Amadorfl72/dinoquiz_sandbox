import React, { useState, useEffect } from 'react';
import { logGameStarted, logBankLoadValidation } from '../utils/analytics';
import { checkForDropOffAlerts } from '../utils/metrics';
import QuestionScreen from './QuestionScreen';
import ResultsScreen from './ResultsScreen';

const GameManager = ({ questions }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameQuestions, setGameQuestions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    // Validate questions bank
    if (!questions || questions.length < 10) {
      logBankLoadValidation(false, 'Not enough questions in bank');
      return;
    }
    
    logBankLoadValidation(true);
    
    // Select 10 random questions
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 10);
    setGameQuestions(selectedQuestions);
    
    // Log game start with question IDs
    logGameStarted(selectedQuestions.map(q => q.id));
    
    // Check for any drop-off or hit percentage alerts
    const loadAlerts = async () => {
      const alerts = await checkForDropOffAlerts();
      setAlerts(alerts);
    };
    
    loadAlerts();
  }, [questions]);
  
  const handleAnswer = (isHit) => {
    if (isHit) {
      setScore(score + 1);
    }
    
    if (currentQuestionIndex < gameQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setGameCompleted(true);
    }
  };
  
  if (gameCompleted) {
    return <ResultsScreen score={score} totalQuestions={gameQuestions.length} />;
  }
  
  if (gameQuestions.length === 0) {
    return <div>Loading questions...</div>;
  }
  
  return (
    <div className="game-manager">
      {alerts.length > 0 && (
        <div className="alerts-banner">
          <p>We've noticed some questions might need review</p>
        </div>
      )}
      
      <QuestionScreen 
        question={gameQuestions[currentQuestionIndex]} 
        onAnswer={handleAnswer} 
      />
      
      <div className="progress">
        Question {currentQuestionIndex + 1} of {gameQuestions.length}
      </div>
    </div>
  );
};

export default GameManager;