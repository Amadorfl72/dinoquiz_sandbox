const fs = require('fs');
const path = require('path');

const QUESTIONS_JSON_PATH = path.resolve(__dirname, '../src/assets/questions.json');

let rawData;
let questions;

beforeAll(() => {
  rawData = fs.readFileSync(QUESTIONS_JSON_PATH, 'utf-8');
  const parsed = JSON.parse(rawData);
  questions = Array.isArray(parsed) ? parsed : parsed.questions;
});

[... rest of the test file with complete test cases ...]