'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');

test('Seriensuche öffnet Staffeln und Episoden und kehrt sicher zurück', async () => {
  const server = createPreviewServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const requests = [];
  try {
    await page.route('**/device-defaults.js', route => route.fulfill({contentType:'application/javascript',body:'window.SMAIRYS_DEVICE_DEFAULTS={enableSeries:true};'}));
    await page.addInitScript(() => { window.webapis = { avplay: { state: 'NONE', open() { this.state = 'IDLE'; }, close() { this.state = 'NONE'; }, stop() { this.state = 'IDLE'; }, setListener() {}, setDisplayRect() {}, prepareAsync(ok) { this.state = 'READY'; setTimeout(ok, 0); }, seekTo(ms, ok) { setTimeout(ok, 0); }, play() { this.state = 'PLAYING'; }, pause() { this.state = 'PAUSED'; }, getState() { return this.state; }, getCurrentTime() { return 1000; }, getDuration() { return 120000; }, getTotalTrackInfo() { return []; }, getCurrentStreamInfo() { return []; } } }; });
    await page.route('**/Users/AuthenticateByName', route => route.fulfill({ json: { AccessToken: 'token', User: { Id: 'user', Name: 'Test' } } }));
    await page.route('**/Users/user/Items/episode1', route => route.fulfill({ json: { Id: 'episode1', Name: 'Episode 1', People: [] } }));
    await page.route('**/Items/episode1/PlaybackInfo', route => route.fulfill({ json: { PlaySessionId: 'session', MediaSources: [{ Id: 'source', SupportsDirectPlay: true }] } }));
    await page.route('**/Sessions/Playing*', route => route.fulfill({ status: 204, body: '' }));
    await page.route('**/Items?*', route => {
      const q = new URL(route.request().url()).searchParams; requests.push({ type: q.get('includeItemTypes'), parent: q.get('parentId'), sort: q.get('sortBy') });
      let items = [];
      if (q.get('includeItemTypes') === 'Series') items = [{ Id: 'series1', Name: 'Testserie' }];
      if (q.get('includeItemTypes') === 'Season' && q.get('parentId') === 'series1') items = [{ Id: 'season1', Name: 'Staffel 1' }];
      if (q.get('includeItemTypes') === 'Episode' && q.get('parentId') === 'season1') items = [{ Id: 'episode1', Name: 'Episode 1' }];
      route.fulfill({ json: { Items: items, StartIndex: Number(q.get('startIndex')), TotalRecordCount: items.length } });
    });
    await page.goto(base + '/?preview=1'); await page.locator('#profile-button').click(); await page.locator('#settings-open').click(); await page.locator('#server-url').fill(base); await page.locator('#settings-back').click();
    await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Test'); await page.locator('#auth-password').fill('password'); await page.locator('#auth-submit').click();
    await page.locator('[data-page="suche"]').click(); await page.locator('#series-search').click();
    assert.equal(await page.locator('#series-search').getAttribute('aria-pressed'), 'true');
    await page.locator('#search-input').fill('Test'); await page.locator('[data-series-id="series1"]').waitFor();
    await page.locator('[data-series-id="series1"]').click(); await page.locator('[data-season-id="season1"]').waitFor();
    assert.equal(await page.locator('#actor-back').textContent(), 'Zurück zur Suche');
    await page.locator('[data-season-id="season1"]').click(); await page.locator('[data-movie-id="episode1"]').waitFor();
    assert.equal(await page.locator('#actor-back').textContent(), 'Zurück zu Staffeln');
    assert.ok(requests.some(r => r.type === 'Episode' && r.parent === 'season1' && r.sort === 'IndexNumber,SortName'));
    await page.keyboard.press('Enter'); await page.locator('#detail-modal').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#detail-title').textContent(), 'Episode 1');
    await page.locator('#play-button').click();
    await page.waitForFunction(() => document.getElementById('player-status').textContent !== 'Wird geladen …', null, { timeout: 5000 });
    assert.equal(await page.locator('#player-status').textContent(), 'Wiedergabe');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.locator('[data-season-id="season1"]').waitFor();
    await page.keyboard.press('Escape'); await page.locator('[data-series-id="series1"]').waitFor();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
