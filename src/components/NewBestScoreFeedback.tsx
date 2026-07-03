import React from 'react';

interface NewBestScoreFeedbackProps {
  isNewBestScore: boolean;
}

const NewBestScoreFeedback: React.FC<NewBestScoreFeedbackProps> = ({ isNewBestScore }) => {
  if (!isNewBestScore) return null;

  return (
    <div className="new-best-score-feedback">
      ¡Nueva mejor puntuación!
    </div>
  );
};

export default NewBestScoreFeedback;