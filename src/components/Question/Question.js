import { useState, useEffect, useRef } from 'react';
import { logQuestionAnswered } from '../../analytics/questionAnsweredLogger';

const Question = ({ question, onAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const questionStartTime = useRef(null);

  useEffect(() => {
    // Reset state when question changes
    setSelectedAnswer(null);
    setShowFeedback(false);
    questionStartTime.current = Date.now();
  }, [question]);

  const handleAnswer = (answer) => {
    const answerTime = Date.now();
    const timeToAnswerMs = answerTime - questionStartTime.current;
    
    setSelectedAnswer(answer);
    const correct = answer === question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // Log the answered question with metrics
    logQuestionAnswered(question.id, correct, timeToAnswerMs);
    
    setTimeout(() => {
      onAnswer(correct);
    }, 4000); // Show feedback for 4 seconds
  };

  return (
    <div className="question-container">
      {/* Question rendering omitted for brevity */}
    </div>
  );
};

export default Question;
