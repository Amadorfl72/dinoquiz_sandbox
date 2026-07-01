import React from 'react';
import { isFirstLoadWithoutConnection } from '../utils/offlineFirstLoad';

const OfflineFirstLoadMessage = () => {
  if (!isFirstLoadWithoutConnection()) return null;
  
  return (
    <div className="offline-first-load-message">
      <p>Conéctate la primera vez para descargar el juego</p>
    </div>
  );
};

export default OfflineFirstLoadMessage;