'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');

test('Player-Navigation folgt horizontalen Tasten und OK springt', async () => {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  const calls = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.addInitScript(() => {
      window.avplayTest = { state: 'NONE', selections: [], current: 1, position: 12000,
        open() { this.state = 'IDLE'; }, close() { this.state = 'NONE'; }, stop() { this.state = 'IDLE'; }, setListener(listener) { this.listener = listener; }, setDisplayRect() {},
        prepareAsync(ok) { this.state = 'READY'; setTimeout(ok, 0); }, play() { this.state = 'PLAYING'; }, pause() { this.state = 'PAUSED'; }, seekTo(ms, ok) { this.seeks = (this.seeks || 0) + 1; this.listener.onbufferingstart(); this.pendingSeek = () => { this.position = ms; ok(); }; },
        getState() { return this.state; }, getCurrentTime() { return this.position; }, getDuration() { return 120000; },
        getTotalTrackInfo() { return [{ type: 'AUDIO', index: 0, extra_info: '{"language":"deu"}' }, { type: 'AUDIO', index: 1, extra_info: '{"language":"eng"}' }, { type: 'TEXT', index: 2, extra_info: '{"track_lang":"de"}' }]; },
        getCurrentStreamInfo() { return [{type:'AUDIO',index:this.current,extra_info:'{}'}]; },
        setSelectTrack(type,index) { this.selections.push({type,index}); if (type === 'AUDIO') this.current = index; }
      }; window.webapis = { avplay: window.avplayTest };
    });
    await page.route('**/Users/AuthenticateByName', async (route) => {
      const request = route.request();
      calls.push({ path: 'login', auth: request.headers().authorization, body: request.postDataJSON() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ AccessToken: 'mock-token', User: { Id: 'mock-user', Name: 'Test' } }) });
    });
    await page.route('**/Items?*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const start = Number(url.searchParams.get('startIndex'));
      calls.push({ path: 'items', auth: request.headers().authorization, start, limit: Number(url.searchParams.get('limit')) });
      const items = Array.from({ length: Math.min(Number(url.searchParams.get('limit')), 8 - start) }, (_, i) => ({ Id: `movie-${start + i}`, Name: `Film ${start + i}`, Overview: 'Testbeschreibung '.repeat(180), ImageTags: { Primary: 'poster' }, BackdropImageTags: ['backdrop'] }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Items: items, StartIndex: start, TotalRecordCount: 8 }) });
    });
    await page.route('**/Sessions/Logout', async (route) => { calls.push({ path: 'logout', auth: route.request().headers().authorization }); await route.fulfill({ status: 204, body: '' }); });
    await page.route('**/Users/mock-user/Items/movie-5', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Id: 'movie-5', Name: 'Film 5', RunTimeTicks: 1200000000, UserData: { PlaybackPositionTicks: 300000000 } }) }));
    await page.route('**/Items/*/PlaybackInfo', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ PlaySessionId: 'session', MediaSources: [{ Id: 'source', SupportsDirectPlay: true }] }) }));
    await page.route('**/Sessions/Playing**', async (route) => { calls.push({ path: new URL(route.request().url()).pathname, body: route.request().postDataJSON() }); await route.fulfill({ status: 204, body: '' }); });
    await page.route('**/Items/*/Images/**', async (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="720"><rect width="480" height="720" fill="#53433a"/></svg>' }));
    await page.goto(base + '/?preview=1', { waitUntil: 'load' });
    await page.locator('#profile-button').click();
    await page.locator('#settings-open').click();
    await page.locator('#server-url').fill(base);
    await page.locator('#settings-back').click();
    await page.locator('#auth-open').click();
    await page.locator('#auth-user').fill('Test');
    await page.locator('#auth-password').fill('test-password');
    await page.locator('#auth-submit').click();
    await page.waitForFunction(() => document.querySelector('[data-movie-id="movie-0"]'));
    assert.equal(calls[0].body.Username, 'Test');
    assert.match(calls[0].auth, /^MediaBrowser /);
    assert.match(calls[1].auth, /Token="mock-token"/);
    assert.equal(await page.locator('#auth-password').inputValue(), '');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.activeElement.getAttribute('data-movie-id') === 'movie-5');
    assert.equal(calls.filter((call) => call.path === 'items').length, 1);
    assert.equal(calls.find((call) => call.path === 'items').limit, 20);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#detail-title').textContent(), 'Film 5');
    await page.locator('#play-button').click();
    await page.waitForFunction(() => window.avplayTest.pendingSeek);
    await page.evaluate(() => { window.avplayTest.pendingSeek(); window.avplayTest.listener.onbufferingcomplete(); });
    await page.waitForFunction(() => document.getElementById('player-status').textContent === 'Wiedergabe');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'player-toggle');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'player-back');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.avplayTest.seeks === 2);
    await page.evaluate(() => { window.avplayTest.pendingSeek(); window.avplayTest.listener.onbufferingcomplete(); });
    assert.equal(await page.evaluate(() => window.avplayTest.position), 20000);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'player-forward');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.avplayTest.seeks === 3);
    await page.evaluate(() => { window.avplayTest.pendingSeek(); window.avplayTest.listener.onbufferingcomplete(); });
    assert.equal(await page.evaluate(() => window.avplayTest.position), 30000);
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {keyCode: 417, which: 417, bubbles: true})));
    await page.waitForFunction(() => window.avplayTest.seeks === 4);
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {keyCode: 417, which: 417, bubbles: true})));
    assert.match(await page.locator('#player-status').textContent(), /5 Min\. pro Sprung/);
    await page.waitForTimeout(1200); assert.equal(await page.evaluate(() => window.avplayTest.seeks), 4, 'Kein zweiter Sprung während der Player noch sucht');
    await page.keyboard.press('Enter'); await page.evaluate(() => { window.avplayTest.pendingSeek(); window.avplayTest.listener.onbufferingcomplete(); });
    assert.equal(await page.evaluate(() => window.avplayTest.position), 90000);
    await page.waitForTimeout(1200); assert.equal(await page.evaluate(() => window.avplayTest.seeks), 4);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'player-forward');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'player-audio');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#track-menu').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'player-audio');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#player-view').isVisible(), false);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
