import React, { useEffect, useState } from 'react';
import './Tooltip.css';

const Tooltip = ({ targetId }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isFirstOpen = localStorage.getItem('firstOpen') === null;
    if (isFirstOpen) {
      setVisible(true);
      localStorage.setItem('firstOpen', 'false');
    }
  }, []);

  const handleFirstTap = () => {
    setVisible(false);
  };

  useEffect(() => {
    if (visible) {
      document.addEventListener('click', handleFirstTap);
    }
    return () => {
      document.removeEventListener('click', handleFirstTap);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="tooltip" data-target={targetId}>
      ¡Pulsa aquí para empezar a jugar!
    </div>
  );
};

export default Tooltip;