'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { root } = require('./runtime-files.cjs');
const { createPreviewServer } = require('./preview.cjs');
const outputIndex = process.argv.indexOf('--output');
if (outputIndex !== -1 && (!process.argv[outputIndex + 1] || process.argv[outputIndex + 1].startsWith('--'))) {
  throw new Error('--output benötigt einen Dateipfad.');
}
const output = outputIndex === -1 ? path.join(root, 'branding', 'preview.png') : path.resolve(root, process.argv[outputIndex + 1]);

async function main() {
  if (fs.existsSync(output) && !process.argv.includes('--force')) {
    throw new Error('Die Ausgabedatei existiert bereits. Zum Ersetzen --force angeben.');
  }
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${server.address().port}/?preview=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-page') === 'start');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.screenshot({ path: output });
    console.log('Vorschau gespeichert: ' + output);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
