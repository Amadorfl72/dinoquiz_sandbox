import React, { useState, useEffect } from 'react';
import { shuffleQuestions, shuffleQuestionAnswers } from '../../utils/questionUtils';
import questions from '../../data/questions.json';

const Quiz = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [shuffledQuestion, setShuffledQuestion] = useState(null);

  useEffect(() => {
    const initialShuffledQuestions = shuffleQuestions(questions).slice(0, 10);
    setShuffledQuestions(initialShuffledQuestions);
  }, []);

  useEffect(() => {
    if (shuffledQuestions.length > 0 && currentQuestionIndex < shuffledQuestions.length) {
      const currentQuestion = shuffledQuestions[currentQuestionIndex];
      const shuffled = shuffleQuestionAnswers(currentQuestion);
      setShuffledQuestion(shuffled);
    }
  }, [currentQuestionIndex, shuffledQuestions]);

  // Rest of the component logic...

  return (
    <div>
      {/* Quiz UI */}
    </div>
  );
};

export default Quiz;