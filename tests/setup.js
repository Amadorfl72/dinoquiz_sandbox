const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '../data');
const questionBankPath = path.join(dataDir, 'questionBank.json');

// Ensure the data directory exists for test discovery
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// If the file doesn't exist yet, create a placeholder so tests can run
// and report meaningful failures
if (!fs.existsSync(questionBankPath)) {
  fs.writeFileSync(questionBankPath, JSON.stringify([], null, 2));
}
