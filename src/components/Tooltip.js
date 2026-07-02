import React, { useEffect, useState, useRef } from 'react';
import './Tooltip.css';

const Tooltip = ({ targetId }) => {
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const isFirstOpen = localStorage.getItem('triofsnd_first_open') === null;
    if (isFirstOpen) {
      setVisible(true);
      localStorage.setItem('triofsnd_first_open', 'true');
    }
  }, []);

  const handleFirstTap = () => {
    setVisible(false);
  };

  useEffect(() => {
    if (visible) {
      // Position tooltip relative to target element
      const targetElement = document.getElementById(targetId);
      if (targetElement && tooltipRef.current) {
        const targetRect = targetElement.getBoundingClientRect();
        tooltipRef.current.style.top = `${targetRect.top - 50}px`;
        tooltipRef.current.style.left = `${targetRect.left + targetRect.width / 2 - 100}px`;
      }
      
      document.addEventListener('click', handleFirstTap);
    }
    return () => {
      document.removeEventListener('click', handleFirstTap);
    };
  }, [visible, targetId]);

  if (!visible) return null;

  return (
    <div 
      className="tooltip" 
      data-testid="first-open-tooltip"
      ref={tooltipRef}
    >
      ¡Pulsa aquí para empezar a jugar!
    </div>
  );
};

export default Tooltip;