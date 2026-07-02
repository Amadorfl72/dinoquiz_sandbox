function endGame(currentScore) {
  const highScore = localStorage.getItem('highScore') || 0;
  if (currentScore > highScore) {
    localStorage.setItem('highScore', currentScore);
    showNewHighScoreMessage();
  }
}

function showNewHighScoreMessage() {
  const messageElement = document.createElement('div');
  messageElement.textContent = '¡Nueva mejor puntuación!';
  messageElement.style.position = 'absolute';
  messageElement.style.top = '20px';
  messageElement.style.left = '50%';
  messageElement.style.transform = 'translateX(-50%)';
  messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  messageElement.style.color = 'white';
  messageElement.style.padding = '10px';
  messageElement.style.borderRadius = '5px';
  document.body.appendChild(messageElement);
  setTimeout(() => {
    document.body.removeChild(messageElement);
  }, 3000);
}