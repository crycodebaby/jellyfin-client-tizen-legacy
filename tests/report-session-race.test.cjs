'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');

test('Abmeldung bei ausstehendem Bericht blockiert keine neue Wiedergabe', async () => {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(5000);
  let firstReport;
  const reports = [];
  try {
    await page.addInitScript(() => {
      window.webapis = { avplay: { open() {}, close() {}, stop() {}, setListener() {}, setDisplayRect() {},
        prepareAsync(ok) { setTimeout(ok, 0); }, play() {}, pause() {}, seekTo(ms, ok) { ok(); },
        getCurrentTime() { return 30000; }, getDuration() { return 120000; } } };
    });
    await page.route('**/Users/AuthenticateByName', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"AccessToken":"token","User":{"Id":"user"}}' }));
    await page.route('**/Items?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"Items":[{"Id":"movie-1","Name":"Film"}],"StartIndex":0,"TotalRecordCount":1}' }));
    await page.route('**/Users/user/Items/movie-1', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"Id":"movie-1","Name":"Film","RunTimeTicks":1200000000}' }));
    await page.route('**/Items/*/PlaybackInfo', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"PlaySessionId":"session","MediaSources":[{"Id":"source","SupportsDirectPlay":true}]}' }));
    await page.route('**/Sessions/Logout', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('**/Sessions/Playing**', async (route) => {
      reports.push(new URL(route.request().url()).pathname);
      if (!firstReport) { firstReport = route; return; }
      await route.fulfill({ status: 204, body: '' });
    });
    await page.goto(base + '/?preview=1');
    await page.locator('#profile-button').click(); await page.locator('#settings-open').click();
    await page.locator('#server-url').fill(base); await page.locator('#settings-back').click();
    await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Test');
    await page.locator('#auth-password').fill('test-password'); await page.locator('#auth-submit').click();
    await page.waitForSelector('[data-movie-id="movie-1"]');
    await page.locator('[data-movie-id="movie-1"]').click(); await page.locator('#play-button').click();
    await page.waitForFunction(() => document.getElementById('player-status').textContent === 'Wiedergabe');
    await page.waitForTimeout(100);
    assert.deepEqual(reports, ['/Sessions/Playing']);
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.locator('#profile-button').click(); await page.locator('#auth-logout').click();
    await page.locator('#profile-button').click(); await page.locator('#auth-open').click();
    await page.locator('#auth-password').fill('test-password'); await page.locator('#auth-submit').click();
    await page.waitForSelector('[data-movie-id="movie-1"]');
    await page.locator('[data-movie-id="movie-1"]').click(); await page.locator('#play-button').click();
    await page.waitForFunction(() => document.getElementById('player-status').textContent === 'Wiedergabe');
    await page.waitForTimeout(100);
    assert.deepEqual(reports, ['/Sessions/Playing', '/Sessions/Playing']);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.deepEqual(reports, ['/Sessions/Playing', '/Sessions/Playing', '/Sessions/Playing/Stopped']);
  } finally {
    if (firstReport) await firstReport.abort().catch(() => {});
    await page.close(); await browser.close(); await new Promise((resolve) => server.close(resolve));
  }
});


