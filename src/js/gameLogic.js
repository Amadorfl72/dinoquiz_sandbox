function endGame(currentScore) {
  const bestScore = localStorage.getItem('bestScore') || 0;
  if (currentScore > bestScore) {
    localStorage.setItem('bestScore', currentScore);
    showNewHighScoreMessage();
  }
}

function showNewHighScoreMessage() {
  const messageElement = document.getElementById('new-best-score-message');
  messageElement.style.display = 'block';
  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 3000);
}