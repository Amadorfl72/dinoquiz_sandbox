import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logEvent } from '../utils/analytics';

const JugarButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    const timestamp = Date.now();
    logEvent('first_tap_jugar', { timestamp });
    navigate('/game');
  };

  return (
    <button onClick={handleClick} style={styles.button}>
      ¡Jugar!
    </button>
  );
};

const styles = {
  button: {
    fontSize: '24px',
    padding: '16px 32px',
    backgroundColor: '#FFD700',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default JugarButton;