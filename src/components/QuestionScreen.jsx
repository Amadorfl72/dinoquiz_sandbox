import React from 'react';
import { buildDinosaurAlt } from '../utils/buildDinosaurAlt.js';

export function QuestionScreen({ question, onAnswer }) {
  const alt = buildDinosaurAlt(question.dinosaurName, question.funFact);

  return (
    <div className="question-screen">
      <img
        src={question.imageSrc}
        alt={alt}
        className="dinosaur-illustration"
      />
      <p className="question-prompt">{question.prompt}</p>
      <ul className="question-options">
        {question.options.map((option) => (
          <li key={option.id}>
            <button type="button" onClick={() => onAnswer(option.id)}>
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
