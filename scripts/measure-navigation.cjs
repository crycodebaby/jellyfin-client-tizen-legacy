'use strict';

// Desktop-only diagnostic: synchronous synthetic key dispatch, not TV paint latency.
const { chromium } = require('playwright');
const { createPreviewServer } = require('./preview.cjs');

async function main() {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-page') === 'start');
    const result = await page.evaluate(() => {
      const timings = [];
      for (let i = 0; i < 30; i += 1) {
        const key = i % 2 ? 38 : 40;
        const started = performance.now();
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, keyCode: key, which: key }));
        timings.push(performance.now() - started);
        const expected = i % 2 ? 'start' : 'filme';
        if (document.activeElement.getAttribute('data-page') !== expected) throw new Error('Fokusabweichung bei Eingabe ' + (i + 1));
      }
      timings.sort((a, b) => a - b);
      return { inputs: timings.length, meanMs: timings.reduce((a, b) => a + b, 0) / timings.length, p95Ms: timings[Math.ceil(timings.length * 0.95) - 1], maxMs: timings[timings.length - 1] };
    });
    console.log(JSON.stringify(result));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
