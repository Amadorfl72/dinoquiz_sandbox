import { logGameStarted } from '../utils/logger';

function GameStartButton() {
  const handleGameStart = () => {
    logGameStarted();
    // Rest of the game start logic
  };
  
  return (
    <button onClick={handleGameStart}>
      ¡Jugar!
    </button>
  );
}

export default GameStartButton;