const express = require('express');
const { handleGameCompleted } = require('./api/gameCompleted');

const app = express();

app.use(express.json());

app.post('/api/game_completed', handleGameCompleted);

module.exports = app;
