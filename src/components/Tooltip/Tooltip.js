import { useState, useEffect } from 'react';
import { trackTooltipShown, trackTooltipDismissed } from '../../analytics/analyticsService';

export default function Tooltip({ id, children }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      trackTooltipShown(id);
    }
  }, [isVisible, id]);
  
  const handleDismiss = () => {
    setIsVisible(false);
    trackTooltipDismissed(id);
  };
  
  // ... rest of the Tooltip component
}
