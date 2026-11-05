'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');

test('Profilstatus und Einstellungen sind mit wenigen Fernbedienungstasten erreichbar', async () => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.route('**/Users/AuthenticateByName', route => route.fulfill({ json: { AccessToken: 'token', User: { Id: 'user', Name: 'Test' } } }));
    await page.route('**/Items?*', route => route.fulfill({ json: { Items: [], StartIndex: 0, TotalRecordCount: 0 } }));
    await page.goto(base + '/?preview=1'); await page.locator('#profile-button').click(); await page.locator('#settings-open').click();
    await page.locator('#server-url').fill(base); await page.locator('#settings-back').click();
    await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Test'); await page.locator('#auth-password').fill('test'); await page.locator('#auth-submit').click();
    await page.locator('#connection-modal').waitFor({ state: 'hidden' }); await page.locator('#profile-button').click();
    assert.equal(await page.locator('#connection-status').textContent(), 'Angemeldet.');
    assert.equal(await page.locator('#auth-logout').isVisible(), true);
    assert.equal(await page.locator(':focus').getAttribute('data-profile-id'), 'user');
    for (const expected of ['auth-open', 'auth-logout', 'phone-open', 'settings-open']) {
      await page.keyboard.press('ArrowDown');
      assert.equal(await page.locator(':focus').getAttribute('id'), expected);
    }
    await page.keyboard.press('Enter'); assert.equal(await page.locator(':focus').getAttribute('id'), 'server-url');
    await page.keyboard.press('ArrowDown'); assert.equal(await page.locator(':focus').getAttribute('id'), 'check-server');
    await page.keyboard.press('ArrowRight'); assert.equal(await page.locator(':focus').getAttribute('id'), 'settings-back');
    await page.keyboard.press('ArrowDown'); assert.equal(await page.locator(':focus').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('ArrowDown'); assert.equal(await page.locator(':focus').getAttribute('id'), 'forget-profile');
    await page.keyboard.press('ArrowUp'); assert.equal(await page.locator(':focus').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator(':focus').getAttribute('data-mode'), 'full');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});

test('Oberfläche, HTTP-Transport und Jellyfin-Client arbeiten mit API-Testantworten zusammen', async () => {
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
        prepareAsync(ok) { this.state = 'READY'; setTimeout(ok, 0); }, play() { this.state = 'PLAYING'; }, pause() { this.state = 'PAUSED'; }, seekTo(ms, ok) { this.position = ms; setTimeout(ok, 0); },
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
    const titleExamples = ['Die wunderbare Reise über die sieben Meere', 'Dreißig Minuten oder weniger', 'Der Gigant aus einer anderen Welt'];
    for (const name of titleExamples) {
      const metrics = await page.locator('.movie-row-active .card-title').first().evaluate((node, value) => { node.textContent = value; return { fits: node.scrollHeight <= node.clientHeight, lines: node.clientHeight / parseFloat(getComputedStyle(node).lineHeight), bottom: node.getBoundingClientRect().bottom }; }, name);
      const nextTop = await page.locator('.movie-row-preview').evaluate((node) => node.getBoundingClientRect().top);
      assert.ok(metrics.fits && metrics.lines > 1 && metrics.bottom < nextTop, 'Lange Filmtitel bleiben vollständig und überlappen die nächste Reihe nicht');
    }
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#detail-title').textContent(), 'Film 5');
    await page.locator('#detail-poster').waitFor({ state: 'visible' });
    await page.locator('#detail-backdrop').waitFor({ state: 'visible' });
    assert.match(await page.locator('#detail-poster').getAttribute('src'), /\/Items\/movie-5\/Images\/Primary/);
    assert.match(await page.locator('#detail-backdrop').getAttribute('src'), /\/Items\/movie-5\/Images\/Backdrop\/0/);
    const panel = await page.locator('.detail-panel').boundingBox();
    const button = await page.locator('#detail-close').boundingBox();
    assert.ok(panel && panel.y >= 0 && panel.y + panel.height <= 1080, 'Detailfenster bleibt im Bildschirm');
    assert.ok(button && button.y >= panel.y && button.y + button.height <= panel.y + panel.height, 'Schließen bleibt im Detailfenster sichtbar');
    await page.locator('#detail-read').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#reading-view').isVisible(), true);
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.locator('#reading-text').evaluate((element) => element.scrollTop) > 0, 'Langer Text kann per Fernbedienung bewegt werden');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'reading-close');
    for (let i = 0; i < 50; i += 1) await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#reading-text').evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1), true, 'Das Textende ist per Fernbedienung erreichbar');
    await page.evaluate(() => { window.oldPoster = document.getElementById('detail-poster'); window.oldPosterError = window.oldPoster.onerror; });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'detail-read');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'movie-5');
    await page.keyboard.press('Enter');
    await page.evaluate(() => window.oldPosterError.call(window.oldPoster));
    assert.equal(await page.locator('#detail-poster').isVisible(), true, 'Ein alter Bildfehler versteckt kein neu geöffnetes Poster');
    await page.locator('#play-button').click();
    await page.waitForFunction(() => document.getElementById('player-status').textContent === 'Wiedergabe');
    assert.equal(await page.evaluate(() => window.avplayTest.position), 30000, 'Wiedergabe springt zur gespeicherten Position');
    await page.waitForFunction(() => window.avplayTest.position === 30000);
    assert.deepEqual(await page.evaluate(() => window.avplayTest.selections[0]), { type: 'AUDIO', index: 0 }, 'Deutsch wird anhand der vom TV gemeldeten Sprache bevorzugt');
    await page.locator('#player-audio').click();
    await page.getByRole('button', { name: 'Englisch · 2' }).click();
    assert.deepEqual(await page.evaluate(() => window.avplayTest.selections[1]), { type: 'AUDIO', index: 1 });
    await page.locator('#player-text').click();
    await page.getByRole('button', { name: 'Deutsch · 1' }).click();
    await page.evaluate(() => window.avplayTest.listener.onsubtitlechange('3000', 'Beispieltext', '0', []));
    assert.equal(await page.locator('#player-subtitle').textContent(), 'Beispieltext');
    await page.locator('#player-text').click();
    await page.getByRole('button', { name: 'Aus', exact: true }).click();
    assert.equal(await page.locator('#player-subtitle').isVisible(), false);
    await page.screenshot({ path: '.build/player-preview.png' });
    await page.waitForFunction(() => document.getElementById('player-toggle').textContent === 'Pause');
    await page.locator('#player-toggle').click();
    assert.equal(await page.locator('#player-status').textContent(), 'Pausiert');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('player-view').style.display === 'none');
    await page.waitForTimeout(100);
    assert.ok(calls.some((call) => call.path === '/Sessions/Playing'));
    assert.ok(calls.some((call) => call.path === '/Sessions/Playing/Stopped' && call.body.PositionTicks === 300000000));
    assert.equal(await page.locator(':focus').getAttribute('id'), 'play-button');
    await page.keyboard.press('Escape');
    await page.locator('#profile-button').click();
    await page.locator('#auth-logout').click();
    await page.waitForFunction(() => document.getElementById('preview-label').style.display !== 'none');
    const stored = await page.evaluate(() => localStorage.getItem('smairys.connection'));
    assert.deepEqual(JSON.parse(stored), { server: base, username: 'Test', password: '' });
    assert.doesNotMatch(stored, /mock-token/);
    assert.equal(await page.evaluate(() => localStorage.getItem('smairys.session')), null, 'Abmelden entfernt die gespeicherte Sitzung');
    await page.reload();
    await page.locator('#profile-button').click();
    assert.equal(await page.locator(':focus').getAttribute('id'), 'auth-open');
    await page.locator('#auth-open').click();
    await page.locator('#auth-password').fill('test-password');
    await page.locator('#auth-submit').click();
    await page.waitForFunction(() => document.querySelector('[data-movie-id="movie-0"]'));
    assert.equal(calls.filter((call) => call.path === 'login').length, 2, 'Nach Abmelden ist eine neue Anmeldung erforderlich');
    await page.locator('#profile-button').click();
    await page.locator('#settings-open').click();
    await page.locator('#forget-profile').click();
    assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('smairys.connection'))), { server: base, username: '', password: '' });
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Gerätevorgabe und gespeicherte Adresse bleiben editierbar und sind an den Benutzer gebunden', async () => {
  const server = createPreviewServer({ mockInfo: { ServerName: 'Testserver' } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.route('**/device-defaults.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `window.SMAIRYS_DEVICE_DEFAULTS={server:${JSON.stringify(base)}};` }));
    await page.goto(base + '/?preview=1');
    await page.locator('#profile-button').click();
    await page.locator('#settings-open').click();
    assert.equal(await page.locator('#server-url').inputValue(), base);
    await page.locator('#check-server').click();
    await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Verbunden') !== -1);
    assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('smairys.connection'))), { server: base, username: '', password: '' });
    await page.evaluate((url) => localStorage.setItem('smairys.connection', JSON.stringify({ server: url, username: 'Saved' })), base);
    await page.reload();
    await page.locator('#profile-button').click();
    await page.locator('#auth-open').click();
    assert.equal(await page.locator('#auth-user').inputValue(), 'Saved');
    await page.locator('[data-action="auth-cancel"]').click();
    await page.locator('#settings-open').click();
    await page.locator('#server-url').fill('http://other.invalid:8096');
    assert.equal(await page.locator('#auth-user').inputValue(), '');
    await page.locator('#server-url').fill(base);
    assert.equal(await page.locator('#auth-user').inputValue(), 'Saved');
  } finally { await page.close(); await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});

test('Nicht verfügbarer Speicher verhindert die Anmeldung nicht', async () => {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('unavailable'); } }); });
    await page.route('**/Users/AuthenticateByName', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"AccessToken":"token","User":{"Id":"user"}}' }));
    await page.route('**/Items?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"Items":[],"StartIndex":0,"TotalRecordCount":0}' }));
    await page.goto(base + '/?preview=1');
    await page.locator('#profile-button').click();
    await page.locator('#settings-open').click();
    await page.locator('#server-url').fill(base);
    await page.locator('#settings-back').click();
    await page.locator('#auth-open').click();
    await page.locator('#auth-user').fill('Test');
    await page.locator('#auth-password').fill('test-password');
    await page.locator('#auth-submit').click();
    await page.waitForFunction(() => document.getElementById('page-title').textContent === 'Filme');
    assert.equal(await page.locator('#auth-password').inputValue(), '');
  } finally { await page.close(); await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});

test('Besetzung, Merkliste und Schauspielersuche arbeiten mit Jellyfin zusammen', async () => {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  let favorite = false;
  const movie = { Id: 'movie-1', Name: 'Film A', Overview: 'Beschreibung', ImageTags: {}, People: [{ Id: 'person-1', Name: 'Alex Beispiel', Type: 'Actor', PrimaryImageTag: 'portrait' }] };
  try {
    await page.route('**/Users/AuthenticateByName', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"AccessToken":"token","User":{"Id":"user"}}' }));
    await page.route('**/Users/user/Items/movie-1', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...movie, UserData: { IsFavorite: favorite } }) }));
    await page.route('**/Users/user/Items/person-1', (route) => route.fulfill({ json: { Id: 'person-1', Name: 'Alex Beispiel', PremiereDate: '1940-01-01T00:00:00Z', EndDate: '2020-05-03T00:00:00Z', ImageTags: { Primary: 'portrait' } } }));
    await page.route('**/Users/user/FavoriteItems/movie-1', (route) => { favorite = route.request().method() === 'POST'; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ IsFavorite: favorite }) }); });
    await page.route('**/Persons?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Items: [{ Id: 'person-1', Name: 'Alex Beispiel', ImageTags: { Primary: 'portrait' } }], StartIndex: 0, TotalRecordCount: 1 }) }));
    await page.route('**/Items?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Items: [movie], StartIndex: 0, TotalRecordCount: 1 }) }));
    await page.goto(base + '/?preview=1');
    await page.locator('#profile-button').click(); await page.locator('#settings-open').click();
    await page.locator('#server-url').fill(base); await page.locator('#settings-back').click();
    await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Test'); await page.locator('#auth-password').fill('test-password'); await page.locator('#auth-submit').click();
    await page.waitForSelector('[data-movie-id="movie-1"]');
    await page.locator('[data-movie-id="movie-1"]').click();
    await page.waitForSelector('#cast-list [data-actor-id="person-1"]');
    assert.equal(await page.locator('#detail-kicker').textContent(), '');
    assert.match(await page.locator('#cast-list img').getAttribute('src'), /person-1\/Images\/Primary/);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-actor-id'), 'person-1');
    await page.keyboard.press('ArrowUp');
    await page.locator('#save-button').click();
    await page.waitForFunction(() => document.getElementById('save-button').getAttribute('aria-pressed') === 'true');
    assert.equal(favorite, true);
    await page.locator('#cast-list [data-actor-id="person-1"]').click();
    await page.waitForSelector('#section-cards [data-movie-id="movie-1"]');
    await page.waitForFunction(() => document.getElementById('person-facts').textContent.includes('1940'));
    assert.equal(await page.locator('#person-hero').isVisible(), true);
    assert.match(await page.locator('#person-facts').textContent(), /† mit 80 Jahren/);
    assert.match(await page.locator('#person-count').textContent(), /1 Film.*in deiner Mediathek/);
    await page.screenshot({ path: '.build/person-page-preview.png' });
    await page.locator('#actor-back').click();
    await page.waitForFunction(() => document.activeElement.getAttribute('data-actor-id') === 'person-1');
    await page.keyboard.press('Escape');
    await page.locator('[data-page="merkliste"]').click();
    await page.waitForSelector('[data-movie-id="movie-1"]');
    await page.locator('[data-page="suche"]').click();
    assert.equal(await page.locator('#search-mode').textContent(), 'Filme');
    await page.locator('#search-mode').click();
    await page.locator('#search-input').fill('Alex');
    await page.waitForSelector('#section-cards [data-actor-id="person-1"]');
    await page.locator('#section-cards [data-actor-id="person-1"]').click();
    await page.waitForSelector('[data-movie-id="movie-1"]');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#search-input').isVisible(), true);
    await page.locator('#search-mode').click();
    assert.equal(await page.locator('#search-mode').textContent(), 'Filme');
    await page.locator('#search-input').fill('Film');
    await page.locator('#search-input').evaluate((input) => { input.focus(); input.setSelectionRange(1, 1); });
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#search-input').evaluate((input) => input.selectionStart), 2);
    assert.equal(await page.locator(':focus').getAttribute('id'), 'search-input');
    await page.locator('#search-input').evaluate((input) => input.setSelectionRange(1, input.value.length));
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'search-input');
    assert.equal(await page.locator('#search-input').evaluate((input) => input.selectionStart), 4);
    await page.locator('#search-input').evaluate((input) => input.setSelectionRange(input.value.length, input.value.length));
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'search-mode');
    await page.waitForSelector('#section-cards [data-movie-id="movie-1"]');
    await page.locator('#section-cards [data-movie-id="movie-1"]').click();
    await page.waitForSelector('#cast-list [data-actor-id="person-1"]');
    await page.locator('#cast-list [data-actor-id="person-1"]').click();
    await page.waitForSelector('#actor-back', { state: 'visible' });
    await page.locator('#actor-back').click();
    await page.waitForFunction(() => document.activeElement.getAttribute('data-actor-id') === 'person-1');
    assert.equal(await page.locator('#search-input').inputValue(), 'Film');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'movie-1');
    await page.locator('#search-mode').click();
    assert.equal(await page.locator('#search-mode').textContent(), 'Schauspieler');
  } finally { await page.close(); await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});

test('Sammlungen öffnen Filme und stellen den Fokus beim Zurückgehen wieder her', async () => {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.route('**/Users/AuthenticateByName', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"AccessToken":"token","User":{"Id":"user"}}' }));
    await page.route('**/Users/user/Items/movie-1', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Id: 'movie-1', Name: 'Film A', People: [{ Id: 'person-1', Name: 'Alex', Type: 'Actor' }] }) }));
    await page.route('**/Items?*', (route) => {
      const params = new URL(route.request().url()).searchParams;
      const collection = params.get('includeItemTypes') === 'BoxSet';
      const item = collection ? { Id: 'collection-1', Name: 'Filmreihe' } : { Id: 'movie-1', Name: 'Film A' };
      if (!collection && params.has('parentId')) { assert.equal(params.get('parentId'), 'collection-1'); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Items: [item], StartIndex: Number(params.get('startIndex')), TotalRecordCount: 1 }) });
    });
    await page.goto(base + '/?preview=1');
    await page.locator('#profile-button').click(); await page.locator('#settings-open').click();
    await page.locator('#server-url').fill(base); await page.locator('#settings-back').click();
    await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Test'); await page.locator('#auth-password').fill('test-password'); await page.locator('#auth-submit').click();
    await page.locator('[data-page="sammlungen"]').click();
    await page.waitForSelector('[data-action="collection-open"]');
    await page.locator('[data-action="collection-open"]').click();
    await page.waitForFunction(() => document.activeElement.getAttribute('data-movie-id') === 'movie-1');
    assert.equal(await page.locator('#page-title').textContent(), 'Filmreihe');
    await page.keyboard.press('Enter');
    await page.locator('#cast-list [data-actor-id="person-1"]').click();
    await page.waitForSelector('#actor-back', { state: 'visible' });
    await page.locator('#actor-back').click();
    await page.waitForFunction(() => document.activeElement.getAttribute('data-actor-id') === 'person-1');
    assert.equal(await page.locator('#page-title').textContent(), 'Filmreihe');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'movie-1');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'collection-1');
  } finally { await page.close(); await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});

test('Sammlung nach Schauspieler filtern und zurücksetzen', async () => {
  const server = createPreviewServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true}); const page = await browser.newPage({viewport:{width:1920,height:1080}}); const requests=[];
  try {
    await page.route('**/Users/AuthenticateByName', route=>route.fulfill({json:{AccessToken:'token',User:{Id:'user'}}}));
    await page.route('**/Genres?*', route=>route.fulfill({json:{Items:[{Id:'g1',Name:'Action'},{Id:'g2',Name:'Drama'}],StartIndex:0,TotalRecordCount:2}}));
    await page.route('**/Persons?*', route=>{const p=new URL(route.request().url()).searchParams; const empty=p.get('searchTerm')==='Niemand'; return route.fulfill({json:{Items:[{Id:empty?'person-2':'person-1',Name:empty?'Niemand':'Alex'}],StartIndex:0,TotalRecordCount:1}});});
    await page.route('**/Items?*', route=>{const p=new URL(route.request().url()).searchParams; const collection=p.get('includeItemTypes')==='BoxSet'; const filtered=p.get('personIds'); if(p.get('parentId')) requests.push({parent:p.get('parentId'),actor:filtered,genres:p.get('genreIds')}); const items=collection?[{Id:'collection-1',Name:'Filmreihe'}]:filtered==='person-2'?[]:filtered?[{Id:'movie-2',Name:'Film mit Alex'}]:[{Id:'movie-1',Name:'Film ohne Alex'},{Id:'movie-2',Name:'Film mit Alex'}]; return route.fulfill({json:{Items:items,StartIndex:Number(p.get('startIndex')),TotalRecordCount:items.length}});});
    await page.goto(base+'/?preview=1'); await page.locator('#profile-button').click(); await page.locator('#settings-open').click(); await page.locator('#server-url').fill(base); await page.locator('#settings-back').click(); await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Test'); await page.locator('#auth-password').fill('test'); await page.locator('#auth-submit').click();
    await page.locator('[data-page="sammlungen"]').click(); await page.locator('[data-action="collection-open"]').click();
    await page.locator('[data-movie-id="movie-1"]').first().waitFor(); await page.locator('#genre-filter').waitFor({state:'visible'}); await page.keyboard.press('ArrowUp'); assert.equal(await page.locator(':focus').getAttribute('id'),'genre-filter'); await page.keyboard.press('Enter'); await page.locator('[data-genre-id=g1]').click(); await page.locator('[data-genre-id=g2]').click(); await page.locator('#genre-apply').click(); await page.locator('#collection-actor-filter').click();
    await page.locator('[data-action="collection-actor-select"]').waitFor(); assert.equal(await page.locator(':focus').getAttribute('data-actor-id'),'person-1');
    await page.locator('#collection-actor-search').fill('Alex'); await page.locator('[data-action="collection-actor-select"]').waitFor(); await page.keyboard.press('ArrowDown'); assert.equal(await page.locator(':focus').getAttribute('data-actor-id'),'person-1'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.getElementById('collection-actor-filter').textContent==='Schauspieler: Alex'); await page.locator('[data-movie-id="movie-2"]').first().waitFor(); assert.equal(await page.locator('[data-movie-id="movie-1"]').count(),0); assert.ok(requests.some(x=>x.parent==='collection-1' && x.actor==='person-1' && x.genres==='g1,g2')); 
    await page.locator('#collection-actor-filter').click(); await page.locator('#collection-actor-clear').click(); await page.locator('[data-movie-id="movie-1"]').first().waitFor(); assert.equal(await page.locator('#collection-actor-filter').textContent(),'Schauspieler: Alle');
    await page.locator('#collection-actor-filter').click(); await page.locator('#collection-actor-search').fill('Niemand'); await page.locator('[data-action="collection-actor-select"]').waitFor(); await page.locator('[data-action="collection-actor-select"]').click(); await page.getByText('Keine Filme gefunden.',{exact:true}).waitFor();
    await page.locator('[data-page="sammlungen"]').focus(); await page.keyboard.press('ArrowRight'); assert.equal(await page.locator(':focus').getAttribute('id'),'collection-actor-filter');
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
});
test('Schauspieler als Bilderraster mit Fernbedienung auswählen und weiterblättern', async () => {
 const server=createPreviewServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080}});
 try {
  await page.route('**/Users/AuthenticateByName',r=>r.fulfill({json:{AccessToken:'token',User:{Id:'user',Name:'Test'}}}));await page.route('**/Genres?*',r=>r.fulfill({json:{Items:[],StartIndex:0,TotalRecordCount:0}}));await page.route('**/Items?*',r=>r.fulfill({json:{Items:[{Id:'film',Name:'Film'}],StartIndex:0,TotalRecordCount:1}}));
  await page.route('**/Persons?*',r=>{let q=new URL(r.request().url()).searchParams,start=Number(q.get('startIndex'));let items=Array.from({length:Math.min(6,9-start)},(_,i)=>({Id:'p'+(start+i),Name:'Person '+(start+i),ImageTags:{Primary:'bild'}}));return r.fulfill({json:{Items:items,StartIndex:start,TotalRecordCount:9}})});
  await page.goto(base+'/?preview=1');await page.locator('#profile-button').click();await page.locator('#settings-open').click();await page.locator('#server-url').fill(base);await page.locator('#settings-back').click();await page.locator('#auth-open').click();await page.locator('#auth-user').fill('Test');await page.locator('#auth-password').fill('test');await page.locator('#auth-submit').click();await page.locator('[data-page="filme"]').click();await page.locator('#collection-actor-filter').click();await page.locator('[data-actor-id=p0]').waitFor();assert.match(await page.locator('[data-actor-id=p0] .actor-choice-portrait').getAttribute('style'),/Images\/Primary/);assert.equal(await page.locator(':focus').getAttribute('data-actor-id'),'p0');await page.keyboard.press('ArrowRight');assert.equal(await page.locator(':focus').getAttribute('data-actor-id'),'p1');await page.keyboard.press('ArrowDown');assert.equal(await page.locator(':focus').getAttribute('data-actor-id'),'p4');await page.keyboard.press('ArrowDown');assert.equal(await page.locator(':focus').getAttribute('id'),'actor-next');await page.keyboard.press('Enter');await page.locator('[data-actor-id=p6]').waitFor();assert.equal(await page.locator(':focus').getAttribute('data-actor-id'),'p6');await page.keyboard.press('Enter');assert.match(await page.locator('#collection-actor-filter').textContent(),/Person 6/);
 } finally {await browser.close();await new Promise(r=>server.close(r));}
});
