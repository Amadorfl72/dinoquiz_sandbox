const puppeteer = require('puppeteer');

describe('Performance Optimization', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('Home screen TTI should be under 2000ms', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Using Chrome DevTools Protocol to get performance metrics
    const client = await page.target().createCDPSession();
    await client.send('Performance.enable');
    
    const metrics = await client.send('Performance.getMetrics');
    
    // Simulating TTI calculation based on FirstMeaningfulPaint and DOMContentLoaded
    // In a real-world scenario, a tool like Lighthouse or tti-polyfill would be used.
    const fmp = metrics.metrics.find(m => m.name === 'FirstMeaningfulPaint').value;
    const domContentLoaded = metrics.metrics.find(m => m.name === 'DomContentLoaded').value;
    
    const tti = Math.max(fmp, domContentLoaded) * 1000; // Convert to ms

    expect(tti).toBeLessThan(2000);
  });
});