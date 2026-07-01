import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './FunFact.css';

const FunFact = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { funFact } = location.state || { funFact: 'No fun fact available.' };

  const handleNext = () => {
    navigate('/next-question'); // Adjust the route as needed
  };

  return (
    <div className="fun-fact">
      <h2>¡Dato Curioso!</h2>
      <p>{funFact}</p>
      <button onClick={handleNext}>Continuar</button>
    </div>
  );
};

export default FunFact;