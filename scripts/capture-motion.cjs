'use strict';

// Local visual check of a deliberately pending mock request; output is gitignored.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { root } = require('./runtime-files.cjs');
const { createPreviewServer } = require('./preview.cjs');

async function main() {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.route('**/System/Info/Public', async (route) => {
      await pending;
      try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ServerName":"Testserver"}' }); } catch {}
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base, { waitUntil: 'load' });
    await page.locator('[data-action="connection"]').first().click();
    await page.locator('#server-url').fill(base);
    await page.locator('#check-server').click();
    await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
    const output = path.join(root, '.build', 'motion-preview.png');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.screenshot({ path: output });
    console.log(`Lokale Vorschau gespeichert: ${output}`);
  } finally {
    release();
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
