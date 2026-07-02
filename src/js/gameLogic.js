function endGame(currentScore) {
  const bestScore = parseInt(localStorage.getItem('bestScore') || '0', 10);
  if (currentScore > bestScore) {
    localStorage.setItem('bestScore', currentScore.toString());
    showNewHighScoreMessage();
  }
}

function showNewHighScoreMessage() {
  const messageElement = document.getElementById('new-best-score-message');
  if (messageElement) {
    messageElement.style.display = 'block';
    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 3000);
  }
}