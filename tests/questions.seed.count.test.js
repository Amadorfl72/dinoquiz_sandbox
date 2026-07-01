const fs = require('fs');
const path = require('path');

const SEED_PATH = path.resolve(__dirname, '../src/data/questions.seed.json');

describe('TRIOFSND-8: Seed file integrity', () => {
  test('seed file is valid JSON', () => {
    expect(() => {
      JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
    }).not.toThrow();
  });

  test('seed file contains 30 entries', () => {
    const data = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
    expect(data).toHaveLength(30);
  });

  test('each entry has all 6 required keys', () => {
    const data = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
    const requiredKeys = [
      'statement',
      'options',
      'correctIndex',
      'dinoId',
      'funFact',
      'image',
    ];
    data.forEach((entry, idx) => {
      requiredKeys.forEach((key) => {
        expect(entry).toHaveProperty(key);
      });
    });
  });
});
