import React from 'react';
import PropTypes from 'prop-types';
import './MuteToggleButton.css';

const MIN_TOUCH_TARGET = '48px';

function MuteToggleButton({ muted, onToggle }) {
  return (
    <button
      type="button"
      className="mute-toggle-button"
      style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
      onClick={onToggle}
      aria-pressed={muted}
      aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}

MuteToggleButton.propTypes = {
  muted: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default MuteToggleButton;
