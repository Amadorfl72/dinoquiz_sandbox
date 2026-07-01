import { logGameStarted } from '../utils/logger';

function GameStartButton() {
  const handleGameStart = () => {
    logGameStarted();
    // Game start logic
  };

  return (
    <button onClick={handleGameStart}>
      ¡Jugar!
    </button>
  );
}

export default GameStartButton;