import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './FunFact.css';

export default function FunFact() {
  const { state } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fun-fact">
      <h2>¡Dato Curioso!</h2>
      <img src={state.image} alt="Dinosaur" />
      <p>{state.funFact}</p>
      <button onClick={() => navigate('/next-question')}>
        Siguiente
      </button>
    </div>
  );
}
