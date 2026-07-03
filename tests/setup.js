const fs = require('fs');
const path = require('path');

const srcAssetsDir = path.resolve(__dirname, '../src/assets');
const questionBankPath = path.join(srcAssetsDir, 'questions.json');

// Ensure src/assets directory exists for test environment
if (!fs.existsSync(srcAssetsDir)) {
  fs.mkdirSync(srcAssetsDir, { recursive: true });
}

// If questions.json does not exist, create a minimal placeholder
// so that tests can detect the missing implementation
if (!fs.existsSync(questionBankPath)) {
  fs.writeFileSync(questionBankPath, JSON.stringify([], null, 2));
}

module.exports = {
  questionBankPath,
};
