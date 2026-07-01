const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('TRIOFSND-53: PWA Setup and Performance Optimization', () => {
  let chrome;
  let result;

  beforeAll(async () => {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
    const options = {
      logLevel: 'error',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'pwa']
    };
    result = await lighthouse(BASE_URL, options);
  }, 60000);

  afterAll(async () => {
    if (chrome) {
      await chrome.kill();
    }
  });

  test('Home screen TTI should be under 2000ms', () => {
    const tti = result.lhr.audits['interactive'].numericValue;
    console.log(`Measured TTI: ${tti}ms`);
    expect(tti).toBeLessThan(2000);
  });

  test('App should be installable', () => {
    const isInstallable = result.lhr.audits['installable-manifest'].score === 1;
    expect(isInstallable).toBe(true);
  });

  test('Manifest should contain a maskable icon', async () => {
    const response = await fetch(`${BASE_URL}/manifest.json`);
    const manifest = await response.json();
    
    const hasMaskableIcon = manifest.icons.some(icon => 
      icon.purpose && icon.purpose.includes('maskable')
    );
    
    expect(hasMaskableIcon).toBe(true);
  });
});