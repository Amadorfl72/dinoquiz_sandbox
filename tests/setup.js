const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '../data');
const questionBankPath = path.join(dataDir, 'questionBank.json');

// Ensure data directory exists for test environment
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// If questionBank.json does not exist, create a minimal placeholder
// so that tests can detect the missing implementation
if (!fs.existsSync(questionBankPath)) {
  fs.writeFileSync(questionBankPath, JSON.stringify([], null, 2));
}

module.exports = {
  questionBankPath,
};