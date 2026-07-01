import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './FunFact.css';

export default function FunFact() {
  const { state } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fun-fact" data-testid="fun-fact-screen">
      <h2 data-testid="fun-fact-heading">¡Dato Curioso!</h2>
      <img src={state.image} alt="Dinosaur" />
      <p data-testid="fun-fact-text">{state.funFact}</p>
      <button onClick={() => navigate('/next-question')}>
        Siguiente
      </button>
    </div>
  );
}