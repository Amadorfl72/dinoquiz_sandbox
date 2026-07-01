import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SessionService from '../services/SessionService';

function ResultsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const score = location.state?.score || 0;
  
  const stars = Math.min(3, Math.floor(score / 3.34) + 1);
  
  const handlePlayAgain = () => {
    SessionService.clearSession();
    navigate('/');
  };

  return (
    <div className="results-screen">
      <h2>Resultados</h2>
      <p>Puntuación: {score}/10</p>
      <p>{'⭐'.repeat(stars)}</p>
      <p>¡Buen trabajo! Sigue aprendiendo sobre dinosaurios.</p>
      <button onClick={handlePlayAgain}>Volver a jugar</button>
    </div>
  );
}

export default ResultsScreen;