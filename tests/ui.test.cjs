'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');
const { root, runtimeFiles } = require('../scripts/runtime-files.cjs');
let server;
let browser;
let base;

before(async () => {
  server = createPreviewServer({ mockInfo: { ServerName: 'Testserver', Version: '0.0' } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function withPage(run) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base + '/?preview=1', { waitUntil: 'load' });
    await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-page') === 'start');
    await run(page);
    assert.deepEqual(errors, [], 'Keine unbehandelten JavaScript-Fehler');
  } finally { await page.close(); }
}

async function press(page, ...keys) {
  for (const key of keys) await page.keyboard.press(key);
}

async function installControlledClient(page) {
  await page.route('**/jellyfin-client.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `
    window.testClient={auth:[],movies:[],authAborts:0,movieAborts:0};
    window.SMAIRYS_JELLYFIN={create:function(){var logged=false;return {
      isAuthenticated:function(){return logged;},
      login:function(user,password,cb){window.testClient.auth.push(function(){logged=true;cb(null,{});});return {abort:function(){window.testClient.authAborts++;}};},
      movies:function(start,limit,cb){window.testClient.movies.push(function(error,items,total){if(error&&error.type==='unauthorized')logged=false;cb(error,error?null:{items:items,total:total,start:start});});return {abort:function(){window.testClient.movieAborts++;}};},
      logout:function(){logged=false;}
    };}};` }));
}

async function beginControlledLogin(page) {
  await page.goto(base + '/?preview=1', { waitUntil: 'load' });
  await page.locator('#profile-button').click();
  await page.locator('#settings-open').click();
  await page.locator('#server-url').fill('http://example.invalid');
  await page.locator('#settings-back').click();
  await page.locator('#auth-open').click();
  await page.locator('#auth-user').fill('Test');
  await page.locator('#auth-password').fill('secret');
  await page.locator('#auth-submit').click();
  await page.evaluate(() => window.testClient.auth[0]());
  await page.waitForFunction(() => window.testClient.movies.length === 1);
}

test('Steuerkreuz öffnet Film und kehrt zum Fokus zurück', async () => withPage(async (page) => {
  await press(page, 'ArrowDown', 'Enter', 'ArrowRight', 'Enter');
  assert.equal(await page.locator('#detail-title').textContent(), 'Fernes Licht');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'save-button');
  await press(page, 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-item'), '0');
  await press(page, 'ArrowLeft', 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-page'), 'start');
}));

test('Leseansicht zeigt das Filmplakat und scrollt per Fernbedienung', async () => withPage(async (page) => {
  await press(page, 'ArrowDown', 'Enter', 'ArrowRight', 'Enter');
  await page.evaluate(() => { document.getElementById('detail-description').textContent = 'Beschreibung '.repeat(500); });
  await page.locator('#detail-read').click();
  assert.match(await page.locator('#reading-art').getAttribute('class'), /art-horizon/);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'reading-close');
  await press(page, 'ArrowDown');
  assert.ok(await page.locator('#reading-text').evaluate((node) => node.scrollTop) > 0);
  await press(page, 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'detail-read');
}));

test('Suche filtert Beispieltitel', async () => withPage(async (page) => {
  await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowRight');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'search-input');
  await page.locator('#search-input').fill('Nacht');
  assert.equal(await page.locator('#section-cards button').count(), 1);
  assert.match(await page.locator('#section-cards').textContent(), /Nachtlinie/);
}));

test('Beispieltitel lassen sich merken und entfernen', async () => withPage(async (page) => {
  await press(page, 'ArrowRight', 'ArrowDown', 'Enter', 'Enter', 'Escape', 'ArrowLeft');
  await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter');
  assert.equal(await page.locator('#section-cards button').count(), 1);
  await press(page, 'ArrowRight', 'Enter', 'Enter', 'Escape');
  assert.match(await page.locator('#empty-state').textContent(), /Noch keine Beispieltitel/);
  assert.equal(await page.locator(':focus').getAttribute('data-page'), 'merkliste');
}));

test('Merkliste behält nach Detailansicht den Titel oder den benachbarten Fokus', async () => withPage(async (page) => {
  for (const index of [0, 1, 2]) {
    await page.locator(`#home-cards [data-item="${index}"]`).click();
    await page.locator('#save-button').click();
    await page.locator('#detail-close').click();
  }
  await page.locator('[data-page="merkliste"]').click();
  await page.locator('#section-cards [data-item="1"]').click();
  await page.locator('#detail-close').click();
  assert.equal(await page.locator(':focus').getAttribute('data-item'), '1');
  await page.keyboard.press('Enter');
  await page.locator('#save-button').click();
  await page.locator('#detail-close').click();
  assert.equal(await page.locator(':focus').getAttribute('data-item'), '2');
}));

test('Anmeldung zeigt echte Filme in begrenzten Fenstern und stellt den Detailfokus wieder her', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.route('**/jellyfin-client.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `
      window.movieCalls=[];window.SMAIRYS_JELLYFIN={create:function(){var logged=false;return {
        isAuthenticated:function(){return logged;},
        login:function(user,password,cb){var t=setTimeout(function(){logged=true;cb(null,{name:user});},0);return {abort:function(){clearTimeout(t);}};},
        movies:function(start,limit,cb){window.movieCalls.push({start:start,limit:limit});var t=setTimeout(function(){var items=[];for(var i=start;i<Math.min(500,start+limit);i++){items.push({id:'film-'+i,title:'Film '+i,description:'Beschreibung '+i,imageUrl:''});}cb(null,{items:items,total:500,start:start});},0);return {abort:function(){clearTimeout(t);}};},
        logout:function(){logged=false;}
      };}};` }));
    await page.goto(base + '/?preview=1', { waitUntil: 'load' });
    await page.locator('#profile-button').click();
    await page.locator('#settings-open').click();
    await page.locator('#server-url').fill('http://example.invalid');
    await page.locator('#settings-back').click();
    await page.locator('#auth-open').click();
    await page.locator('#auth-user').fill('Test');
    await page.locator('#auth-password').fill('test-password');
    await page.locator('#auth-submit').click();
    await page.waitForFunction(() => document.querySelector('[data-movie-id="film-0"]'));
    assert.equal(await page.locator('#auth-password').inputValue(), '');
    assert.equal(await page.locator('#section-cards button').count(), 5);
    assert.equal(await page.locator('#home-cards').isVisible(), false);
    assert.equal(await page.locator('#preview-label').isVisible(), false);
    assert.equal(await page.locator('.movie-row-preview .media-card').count(), 5);
    assert.equal(await page.locator('.movie-row-previous .media-card').count(), 0);
    assert.equal(await page.locator('.movie-row-previous button, .movie-row-preview button').count(), 0);
    await press(page, 'ArrowRight', 'ArrowDown');
    await page.waitForFunction(() => document.activeElement.getAttribute('data-movie-id') === 'film-5');
    await page.evaluate(() => { document.getElementById('app').className = 'motion-full'; });
    await page.waitForTimeout(150);
    const leftInset = await page.evaluate(() => {
      const grid = document.querySelector('.movie-grid').getBoundingClientRect();
      const poster = document.activeElement.querySelector('.poster').getBoundingClientRect();
      return poster.left - grid.left;
    });
    assert.ok(leftInset >= 6, 'Der Fokusrahmen der ersten Karte bleibt inklusive Schatten im Filmraster sichtbar');
    assert.match(await page.locator('.movie-row-previous').textContent(), /Film 0/);
    assert.equal(await page.locator('#section-cards button').count(), 5);
    assert.equal(await page.evaluate(() => window.movieCalls.length), 1);
    assert.equal(await page.evaluate(() => window.movieCalls[0].limit), 20);
    await press(page, 'Enter', 'Escape');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'film-5');
    await press(page, 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight');
    await page.waitForFunction(() => document.activeElement.getAttribute('data-movie-id') === 'film-4');
    const bounds = await page.locator(':focus').boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 1920, 'Fokussierte Karte ist sichtbar');
    async function assertVisibleMovie(index) {
      assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), `film-${index}`);
      assert.ok(await page.locator('#section-cards button').count() <= 5);
      const rect = await page.locator(':focus').boundingBox();
      assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= 1920, `Fokus bei ${index} ist sichtbar`);
    }
    for (let start = 5; start < 500; start += 5) {
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction((id) => document.activeElement.getAttribute('data-movie-id') === id, `film-${start + 4}`);
      await press(page, 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft');
      await page.waitForFunction((id) => document.activeElement.getAttribute('data-movie-id') === id, `film-${start}`);
      await assertVisibleMovie(start);
      await page.waitForFunction((index) => document.querySelector('.movie-row-previous').textContent.indexOf('Film ' + index) !== -1, start - 5);
      assert.equal(await page.locator('.movie-row-previous button, .movie-row-preview button').count(), 0);
      for (let i = 1; i < 5; i += 1) { await page.keyboard.press('ArrowRight'); await assertVisibleMovie(start + i); }
    }
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => document.activeElement.getAttribute('data-movie-id') === 'film-494');
    await assertVisibleMovie(494);
    const requests = await page.evaluate(() => window.movieCalls.map((call) => call.start));
    assert.equal(new Set(requests).size, 25, '500 Einträge benötigen 25 unterschiedliche Datenseiten');
    assert.ok(requests.length <= 50, 'Abgebrochene Vorschauen verursachen nur begrenzte Wiederholungen');
    await page.locator('[data-page="start"]').click();
    assert.equal(await page.locator('#section-view').isVisible(), false);
    await page.locator('#profile-button').click();
    await page.locator('#auth-logout').click();
    assert.equal(await page.locator('#preview-label').isVisible(), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('Abbruch der Anmeldung und Abmeldung verwerfen verspätete Antworten', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.route('**/jellyfin-client.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `
      window.pendingAuth=[];window.pendingMovies=[];
      window.SMAIRYS_JELLYFIN={create:function(){var logged=false;return {
        isAuthenticated:function(){return logged;},
        login:function(user,password,cb){window.pendingAuth.push(function(){logged=true;cb(null,{});});return {abort:function(){}};},
        movies:function(start,limit,cb){window.pendingMovies.push(function(){cb(null,{items:[{id:'late',title:'Veraltet',description:'',imageUrl:''}],total:1,start:start});});return {abort:function(){}};},
        logout:function(){logged=false;}
      };}};` }));
    await page.goto(base + '/?preview=1', { waitUntil: 'load' });
    await page.locator('#profile-button').click();
    await page.locator('#settings-open').click();
    await page.locator('#server-url').fill('http://example.invalid');
    await page.locator('#settings-back').click();
    await page.locator('#auth-open').click();
    await page.locator('#auth-user').fill('Test');
    await page.locator('#auth-password').fill('secret');
    await page.locator('#auth-submit').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#auth-password').inputValue(), '');
    await page.evaluate(() => window.pendingAuth[0]());
    assert.equal(await page.locator('#preview-label').isVisible(), true);
    await page.locator('#profile-button').click();
    await page.locator('#auth-open').click();
    await page.locator('#auth-password').fill('secret');
    await page.locator('#auth-submit').click();
    await page.evaluate(() => window.pendingAuth[1]());
    await page.waitForFunction(() => window.pendingMovies.length === 1);
    await page.locator('#profile-button').click();
    await page.locator('#auth-logout').click();
    await page.evaluate(() => window.pendingMovies[0]());
    assert.equal(await page.locator('#preview-label').isVisible(), true);
    assert.equal(await page.locator('[data-movie-id="late"]').count(), 0);
  } finally { await page.close(); }
});

test('Filmantwort bei geöffnetem Dialog beendet Laden ohne Fokuswechsel', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await installControlledClient(page);
    await beginControlledLogin(page);
    await page.locator('#profile-button').click();
    await page.evaluate(() => window.testClient.movies[0](null, [{id:'one',title:'Film',description:'',imageUrl:''}], 1));
    assert.equal(await page.locator(':focus').getAttribute('id'), 'auth-logout');
    assert.equal(await page.locator('[data-movie-id="one"]').count(), 1);
    assert.equal(await page.locator('#empty-state').isVisible(), false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'profile-button');
  } finally { await page.close(); }
});

test('Startseite fokussiert nach Anmeldung keine verborgenen Beispieltitel', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await installControlledClient(page);
    await beginControlledLogin(page);
    await page.evaluate(() => window.testClient.movies[0](null, [{id:'one',title:'Film',description:'',imageUrl:''}], 1));
    await page.locator('[data-page="start"]').click();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('data-action'), 'connection');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-action'), 'connection');
    assert.equal(await page.locator('#home-cards .is-focused').count(), 0);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#connection-modal').isVisible(), true);
    assert.equal(await page.locator('#detail-modal').isVisible(), false);
  } finally { await page.close(); }
});

test('Filmfenster bleibt bei Dialogwechsel fokussierbar und kann erneut laden', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await installControlledClient(page);
    await beginControlledLogin(page);
    await page.evaluate(() => window.testClient.movies[0](null, Array.from({length:20}, (_, i) => ({id:'id-'+i,title:'Film '+i,description:'',imageUrl:''})), 21));
    await press(page, 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');
    await page.waitForFunction(() => window.testClient.movies.length === 3);
    await page.locator('#profile-button').click();
    await page.evaluate(() => window.testClient.movies[2](null, [{id:'id-20',title:'Film 20',description:'',imageUrl:''}], 21));
    assert.equal(await page.locator('#empty-state').isVisible(), false);
    await page.keyboard.press('Escape');
    await page.locator('[data-movie-id="id-19"]').focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => window.testClient.movies.length === 4);
    await page.evaluate(() => window.testClient.movies[3](null, [{id:'id-20',title:'Film 20',description:'',imageUrl:''}], 21));
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'id-20');
  } finally { await page.close(); }
});

test('Abgelaufene Sitzung wird auch bei offenem Dialog vollständig verworfen', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await installControlledClient(page);
    await beginControlledLogin(page);
    await page.evaluate(() => window.testClient.movies[0](null, Array.from({length:20}, (_, i) => ({id:'id-'+i,title:'Film '+i,description:'',imageUrl:''})), 21));
    await press(page, 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');
    await page.waitForFunction(() => window.testClient.movies.length === 3);
    await page.locator('#profile-button').click();
    await page.evaluate(() => window.testClient.movies[2]({type:'unauthorized'}));
    assert.equal(await page.locator('#preview-label').isVisible(), true);
    assert.equal(await page.locator('#server-url').evaluate((element) => element.readOnly), false);
    assert.equal(await page.locator('#section-cards button').count(), 0);
    assert.match(await page.locator('#connection-status').textContent(), /Sitzung ist abgelaufen/);
  } finally { await page.close(); }
});

test('Vorschau an Seitengrenze bleibt begrenzt und behandelt Sitzungsablauf', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await installControlledClient(page);
    await beginControlledLogin(page);
    await page.evaluate(() => window.testClient.movies[0](null, Array.from({length:20}, (_, i) => ({id:'id-'+i,title:'Film '+i,description:'',imageUrl:''})), 40));
    await press(page, 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown');
    await page.waitForFunction(() => window.testClient.movies.length === 2);
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'id-15');
    await page.evaluate(() => window.testClient.movies[1]({type:'unauthorized'}));
    assert.match(await page.locator('#connection-status').textContent(), /Sitzung ist abgelaufen/);
    assert.equal(await page.locator('#section-cards [data-zone="cards"]').count(), 0);
  } finally { await page.close(); }
});

for (const scenario of ['empty', 'short', 'duplicate', 'duplicate-local', 'changed-total']) {
  test(`Inkonsistente Filmseite (${scenario}) behält letzte gültige Karte und Fokus`, async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    try {
      await installControlledClient(page);
      await beginControlledLogin(page);
      await page.evaluate(() => window.testClient.movies[0](null, Array.from({length:20}, (_, i) => ({id:'id-'+i,title:'Film '+i,description:'',imageUrl:''})), 40));
      await press(page, 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');
      await page.waitForFunction(() => window.testClient.movies.length === 3);
      await page.evaluate((kind) => {
        let items = [];
        if (kind === 'short') items = [{id:'id-20',title:'Film 20',description:'',imageUrl:''}];
        if (kind === 'duplicate') items = Array.from({length:20}, (_, i) => ({id:i === 0 ? 'id-19' : 'id-'+(20+i),title:'Film',description:'',imageUrl:''}));
        if (kind === 'duplicate-local') items = Array.from({length:20}, (_, i) => ({id:i === 1 ? 'id-20' : 'id-'+(20+i),title:'Film',description:'',imageUrl:''}));
        if (kind === 'changed-total') items = Array.from({length:20}, (_, i) => ({id:'id-'+(20+i),title:'Film',description:'',imageUrl:''}));
        window.testClient.movies[2](null, items, kind === 'changed-total' ? 41 : 40);
      }, scenario);
      assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'id-19');
      assert.equal(await page.locator('#section-cards button').count(), 5);
      assert.equal(await page.locator('#empty-state').isVisible(), true);
      assert.match(await page.locator('#empty-state').textContent(), /Bibliothek|geladen|erneut|aktual/i);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => window.testClient.movies.length), 3, 'Weitere Anfragen bleiben bis zur Aktualisierung gesperrt');
      assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'id-19');
      await page.locator('[data-page="filme"]').click();
      await page.waitForFunction(() => window.testClient.movies.length === 4);
      await page.evaluate(() => window.testClient.movies[3](null, [{id:'fresh',title:'Aktuell',description:'',imageUrl:''}], 1));
      assert.equal(await page.locator('[data-movie-id="fresh"]').count(), 1);
      assert.equal(await page.locator('#empty-state').isVisible(), false);
    } finally { await page.close(); }
  });
}

test('Abmeldung verwirft den Filmpuffer vor erneuter Anmeldung', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await installControlledClient(page);
    await beginControlledLogin(page);
    await page.evaluate(() => window.testClient.movies[0](null, [{id:'old',title:'Alt',description:'',imageUrl:''}], 1));
    await page.locator('#profile-button').click();
    await page.locator('#auth-logout').click();
    await page.locator('#profile-button').click();
    await page.locator('#auth-open').click();
    await page.locator('#auth-password').fill('secret');
    await page.locator('#auth-submit').click();
    await page.evaluate(() => window.testClient.auth[1]());
    await page.waitForFunction(() => window.testClient.movies.length === 2);
    assert.equal(await page.locator('[data-movie-id="old"]').count(), 0);
    await page.evaluate(() => window.testClient.movies[1](null, [{id:'new',title:'Neu',description:'',imageUrl:''}], 1));
    assert.equal(await page.locator('[data-movie-id="new"]').count(), 1);
  } finally { await page.close(); }
});

async function prepareInconsistentMovies(page) {
  await installControlledClient(page);
  await beginControlledLogin(page);
  await page.evaluate(() => window.testClient.movies[0](null, Array.from({length:20}, (_, i) => ({id:'id-'+i,title:'Film '+i,description:'',imageUrl:''})), 40));
  await press(page, 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');
  await page.waitForFunction(() => window.testClient.movies.length === 3);
  await page.evaluate(() => window.testClient.movies[2](null, [], 40));
  assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'id-19');
}

test('Nach Fehler lädt erneutes Öffnen der Filmseite sofort neu', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await prepareInconsistentMovies(page);
    await page.locator('[data-page="start"]').click();
    await page.locator('[data-page="filme"]').click();
    await page.waitForFunction(() => window.testClient.movies.length === 4);
    await page.evaluate(() => window.testClient.movies[3](null, [{id:'fresh',title:'Aktuell',description:'',imageUrl:''}], 1));
    assert.equal(await page.locator('[data-movie-id="fresh"]').count(), 1);
    assert.equal(await page.locator('#empty-state').isVisible(), false);
  } finally { await page.close(); }
});

test('Verworfener Refresh im Profildialog erhält den Sperrhinweis', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await prepareInconsistentMovies(page);
    await page.locator('[data-page="filme"]').click();
    await page.waitForFunction(() => window.testClient.movies.length === 4);
    await page.locator('#profile-button').click();
    await page.evaluate(() => window.testClient.movies[3](null, [{id:'fresh',title:'Aktuell',description:'',imageUrl:''}], 1));
    assert.equal(await page.locator(':focus').getAttribute('id'), 'auth-logout');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#empty-state').isVisible(), true);
    assert.match(await page.locator('#empty-state').textContent(), /erneut öffnen/i);
    assert.equal(await page.locator('[data-movie-id="fresh"]').count(), 0);
  } finally { await page.close(); }
});

test('Verzögerter Refresh zerstört keinen zwischenzeitlich bewegten Fokus', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await prepareInconsistentMovies(page);
    await page.locator('[data-page="filme"]').click();
    await page.waitForFunction(() => window.testClient.movies.length === 4);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'id-15');
    await page.evaluate(() => window.testClient.movies[3](null, [{id:'fresh',title:'Aktuell',description:'',imageUrl:''}], 1));
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'id-15');
    assert.equal(await page.locator('[data-movie-id="fresh"]').count(), 0);
    assert.equal(await page.locator('#empty-state').isVisible(), true);
  } finally { await page.close(); }
});

test('Anmeldung sperrt Eingaben und unload bricht ab', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await installControlledClient(page);
    await page.goto(base + '/?preview=1', { waitUntil: 'load' });
    await page.locator('#profile-button').click();
    await page.locator('#settings-open').click();
    await page.locator('#server-url').fill('  http://example.invalid  ');
    await page.locator('#settings-back').click();
    await page.locator('#auth-open').click();
    assert.equal(await page.locator('#auth-warning').isVisible(), false);
    await page.locator('#auth-user').fill('Test');
    await page.locator('#auth-password').fill('secret');
    await page.locator('#auth-submit').click();
    assert.equal(await page.locator('#auth-warning').isVisible(), false);
    assert.equal(await page.locator('#auth-user').evaluate((element) => element.readOnly), true);
    assert.equal(await page.locator('#auth-password').evaluate((element) => element.readOnly), true);
    await page.locator('#auth-user').focus();
    await page.keyboard.type('other');
    assert.equal(await page.locator('#auth-user').inputValue(), 'Test');
    await page.evaluate(() => { const input = document.getElementById('server-url'); input.value = 'https://example.invalid'; input.dispatchEvent(new Event('input')); });
    assert.equal(await page.locator('#auth-warning').isVisible(), false);
    assert.equal(await page.locator('#auth-password').inputValue(), '');
    assert.equal(await page.evaluate(() => window.testClient.authAborts), 1);
    await page.evaluate(() => { const input = document.getElementById('server-url'); input.value = ' http://example.invalid '; input.dispatchEvent(new Event('input')); });
    assert.equal(await page.locator('#auth-warning').isVisible(), false);
    await page.locator('#auth-password').fill('secret');
    await page.locator('#auth-submit').click();
    await page.evaluate(() => window.dispatchEvent(new Event('unload')));
    assert.equal(await page.locator('#auth-password').inputValue(), '');
    assert.equal(await page.evaluate(() => window.testClient.authAborts), 2);
  } finally { await page.close(); }
});

test('unload bricht laufende Filmanfrage ab', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await installControlledClient(page);
    await beginControlledLogin(page);
    await page.evaluate(() => window.dispatchEvent(new Event('unload')));
    assert.equal(await page.evaluate(() => window.testClient.movieAborts), 1);
  } finally { await page.close(); }
});

test('Entdecken öffnet ein Duo und stellt den Fokus wieder her', async () => withPage(async (page) => {
  await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'Enter');
  assert.equal(await page.locator('#detail-title').textContent(), 'Darsteller A & B');
  assert.equal(await page.locator('#save-button').isVisible(), false);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'detail-close');
  await press(page, 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-item'), '7');
}));

test('Serverdialog prüft Eingaben und verarbeitet eine lokale Testantwort', async () => withPage(async (page) => {
  await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter', 'ArrowDown', 'Enter');
  assert.match(await page.locator('#connection-status').textContent(), /gültige Adresse/);
  await page.locator('#server-url').fill(base);
  await press(page, 'ArrowDown', 'Enter');
  await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Verbunden mit Testserver') !== -1);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#connection-orbit').isVisible(), false, 'Schnelle Antworten blitzen nicht nachträglich auf');
  assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  await press(page, 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-action'), 'connection');
}));

test('30 schnelle Richtungswechsel und Wechsel zwischen Inhaltsreihen bleiben synchron', async () => withPage(async (page) => {
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-page'), i % 2 ? 'start' : 'filme');
  }
  await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowRight');
  for (let i = 0; i < 6; i += 1) {
    await press(page, 'ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-zone'), 'people');
    await press(page, 'ArrowUp');
    assert.equal(await page.locator(':focus').getAttribute('data-zone'), 'cards');
  }
}));

test('Langsame Anfrage zeigt Orbit, ignoriert Doppelstart und räumt nach Erfolg auf', async () => withPage(async (page) => {
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/System/Info/Public', async (route) => {
    calls += 1;
    await gate;
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ServerName":"Langsam"}' }); } catch {}
  });
  try {
    await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter');
    await page.locator('#server-url').fill(base);
    await press(page, 'ArrowDown', 'Enter');
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'true');
    await press(page, 'Enter', 'Enter', 'Enter');
    assert.equal(calls, 1);
    release();
    await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Verbunden mit Langsam') !== -1);
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
    await press(page, 'Enter');
    await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Verbunden mit Langsam') !== -1);
    assert.equal(calls, 2, 'Nach Abschluss ist eine erneute Prüfung möglich');
  } finally { release(); }
}));

test('Abbruch beim Verlassen verhindert veraltete Netzwerkantworten', async () => withPage(async (page) => {
  let release;
  let routeDone;
  const gate = new Promise((resolve) => { release = resolve; });
  const done = new Promise((resolve) => { routeDone = resolve; });
  await page.route('**/System/Info/Public', async (route) => {
    await gate;
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ServerName":"Veraltet"}' }); } catch {}
    routeDone();
  });
  try {
    await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter');
    await page.locator('#server-url').fill(base);
    await press(page, 'ArrowDown', 'Enter');
    await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
    await press(page, 'Escape', 'ArrowLeft', 'ArrowDown', 'Enter');
    assert.equal(await page.locator('#page-title').textContent(), 'Filme');
    release();
    await done;
    await page.locator('#profile-button').click();
    assert.match(await page.locator('#connection-status').textContent(), /abgebrochen/);
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  } finally { release(); }
}));

test('HTTP-Fehler beendet Laden und erlaubt Wiederholung', async () => withPage(async (page) => {
  let calls = 0;
  await page.route('**/System/Info/Public', async (route) => {
    calls += 1;
    await route.fulfill(calls === 1 ? { status: 503, body: 'offline' } : { status: 200, contentType: 'application/json', body: '{"ServerName":"Wieder da"}' });
  });
  await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter');
  await page.locator('#server-url').fill(base);
  await press(page, 'ArrowDown', 'Enter');
  await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('HTTP 503') !== -1);
  assert.equal(await page.locator('#connection-orbit').isVisible(), false);
  assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  await press(page, 'Enter');
  await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Wieder da') !== -1);
  assert.equal(calls, 2);
}));

test('Eine geänderte Adresse entwertet die laufende Antwort', async () => withPage(async (page) => {
  let release;
  let routeDone;
  const gate = new Promise((resolve) => { release = resolve; });
  const done = new Promise((resolve) => { routeDone = resolve; });
  await page.route('**/System/Info/Public', async (route) => {
    await gate;
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ServerName":"Alt"}' }); } catch {}
    routeDone();
  });
  try {
    await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter');
    await page.locator('#server-url').fill(base);
    await press(page, 'ArrowDown', 'Enter');
    await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
    await page.locator('#server-url').fill('http://anderer-server:8096');
    release();
    await done;
    assert.match(await page.locator('#connection-status').textContent(), /Adresse geändert/);
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  } finally { release(); }
}));

test('Orbit bleibt in reduzierten und ausgeschalteten Modi sichtbar, aber unbewegt', async () => {
  for (const mode of ['reduced', 'off']) {
    await withPage(async (page) => {
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      await page.route('**/System/Info/Public', async (route) => {
        await gate;
        try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch {}
      });
      try {
        await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter');
        await page.locator(`[data-mode="${mode}"]`).click();
        await page.locator('#server-url').fill(base);
        await page.locator('#check-server').click();
        await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
        assert.equal(await page.locator('#connection-orbit').evaluate((element) => getComputedStyle(element).animationName), 'none');
        await press(page, 'Escape');
      } finally { release(); }
    });
  }
});

test('Zeitüberschreitung beendet den Ladezustand mit passender Meldung', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.addInitScript(() => {
      function TimeoutRequest() { this.readyState = 0; this.status = 0; }
      TimeoutRequest.prototype.open = function () {};
      TimeoutRequest.prototype.send = function () {
        const self = this;
        setTimeout(() => {
          self.readyState = 4;
          if (self.onreadystatechange) self.onreadystatechange();
          if (self.ontimeout) self.ontimeout();
        }, 20);
      };
      TimeoutRequest.prototype.abort = function () {};
      window.XMLHttpRequest = TimeoutRequest;
    });
    await page.goto(base + '/?preview=1', { waitUntil: 'load' });
    await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-page') === 'start');
    await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter');
    await page.locator('#server-url').fill('http://example.invalid');
    await press(page, 'ArrowDown', 'Enter');
    await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Zeitüberschreitung') !== -1);
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  } finally { await page.close(); }
});

test('Tastendruck gibt sofort Rückmeldung und setzt den Merken-Zustand', async () => withPage(async (page) => {
  await press(page, 'ArrowRight', 'ArrowDown', 'Enter');
  await page.keyboard.down('Enter');
  assert.equal(await page.locator('#save-button').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#save-button').getAttribute('class'), /is-pressed/);
  await page.keyboard.up('Enter');
  assert.doesNotMatch(await page.locator('#save-button').getAttribute('class'), /is-pressed/);
}));

test('Motion aus ist per Fernbedienung nutzbar und bleibt nach Neustart erhalten', async () => withPage(async (page) => {
  await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'Enter');
  assert.equal(await page.locator('[data-mode="off"]').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#app').getAttribute('class'), /motion-off/);
  await press(page, 'Escape', 'ArrowDown', 'Enter');
  assert.equal(await page.locator('#detail-title').textContent(), 'Fernes Licht');
  await page.keyboard.down('Enter');
  assert.equal(await page.locator('#save-button').getAttribute('aria-pressed'), 'true');
  await page.keyboard.up('Enter');
  await press(page, 'Escape', 'ArrowLeft');
  for (let i = 0; i < 30; i += 1) await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown');
  assert.equal(await page.locator(':focus').getAttribute('data-page'), 'start');
  await page.reload();
  assert.match(await page.locator('#app').getAttribute('class'), /motion-off/);
  const motion = await page.locator('.poster').first().evaluate((element) => ({ animation: getComputedStyle(element).animationName, transition: getComputedStyle(element).transitionDuration }));
  assert.equal(motion.animation, 'none');
  assert.equal(motion.transition, '0s');
}));

test('Systemvorgabe und fehlende Legacy-APIs führen zu reduziertem Motion-Modus', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  try {
    await page.goto(base + '/?preview=1', { waitUntil: 'load' });
    assert.match(await page.locator('#app').getAttribute('class'), /motion-reduced/);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.getElementById('app').className.indexOf('motion-full') !== -1);
  } finally { await page.close(); }
  const legacy = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await legacy.addInitScript(() => {
      window.matchMedia = undefined;
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage unavailable'); } });
    });
    await legacy.goto(base + '/?preview=1', { waitUntil: 'load' });
    assert.match(await legacy.locator('#app').getAttribute('class'), /motion-reduced/);
    await legacy.locator('#profile-button').click();
    await legacy.locator('#settings-open').click();
    await legacy.locator('[data-mode="full"]').click();
    assert.match(await legacy.locator('#app').getAttribute('class'), /motion-full/);
  } finally { await legacy.close(); }
  const unsupported = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await unsupported.addInitScript(() => { window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} }); });
    await unsupported.goto(base + '/?preview=1', { waitUntil: 'load' });
    assert.match(await unsupported.locator('#app').getAttribute('class'), /motion-reduced/);
  } finally { await unsupported.close(); }
});

test('Diagnose bleibt standardmäßig aus und sammelt nur nach Opt-in lokale Messungen', async () => withPage(async (page) => {
  assert.equal(await page.evaluate(() => typeof window.SMAIRYS_DIAGNOSTICS), 'undefined');
  await page.goto(base + '/?diagnostics=1&preview=1', { waitUntil: 'load' });
  await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-page') === 'start');
  await press(page, 'ArrowDown');
  await page.waitForFunction(() => window.SMAIRYS_DIAGNOSTICS.snapshot().entries.some((entry) => entry.type === 'focus-frame-callback'));
  const snapshot = await page.evaluate(() => window.SMAIRYS_DIAGNOSTICS.snapshot());
  assert.ok(snapshot.entries.some((entry) => entry.type === 'focus-dom'));
  assert.equal(snapshot.visibleCards, 5);
  assert.equal(JSON.stringify(snapshot).includes(base), false);
}));

test('Markenwerte lassen sich zentral austauschen', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.route('**/branding/config.js', (route) => route.fulfill({
      status: 200, contentType: 'application/javascript',
      body: "window.SMAIRYS_BRANDING={appTitle:'Eigenes Kino',headerName:'EIGEN',headerSubtitle:'KINO',avatarInitial:'E',slogan:'Mein Kino'};"
    }));
    await page.goto(base + '/?preview=1', { waitUntil: 'load' });
    assert.equal(await page.title(), 'Eigenes Kino');
    assert.equal(await page.locator('#brand-name-main').textContent(), 'EIGEN');
    assert.equal(await page.locator('#brand-name-sub').textContent(), 'KINO');
    assert.equal(await page.locator('#brand-avatar').textContent(), 'E');
    assert.equal(await page.locator('.brand').getAttribute('aria-label'), 'Eigenes Kino – Mein Kino');
  } finally { await page.close(); }
});

test('Tizen-Vorbereitung enthält nur die erlaubten Laufzeitdateien', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/prepare-runtime.cjs')], { cwd: root, stdio: 'pipe' });
  const target = path.join(root, '.build', 'runtime');
  function filesAt(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory() ? filesAt(path.join(directory, entry.name), name) : [name];
    });
  }
  assert.deepEqual(filesAt(target).sort(), runtimeFiles().sort());
  for (const forbidden of ['SKILL.md', '.env', 'node_modules', 'docs', '.github', 'tests']) {
    assert.equal(fs.existsSync(path.join(target, forbidden)), false, `${forbidden} gehört nicht ins Paket`);
  }
});

test('Git ignoriert private und generierte Dateien, aber keine Projektdateien', () => {
  const ignored = ['.env.local', '.npmrc', 'private/test.p12', 'private/test.key', 'private/test.p8', 'profiles.xml', '.build/runtime/config.xml', 'example.wgt', 'node_modules/test/index.js'];
  const kept = ['branding/config.js', 'assets/poster-horizon.svg', 'README.md', 'SKILL.md', '.env.example'];
  function ignoreStatus(file) {
    const result = spawnSync('git', ['-c', `safe.directory=${root.replace(/\\/g, '/')}`, 'check-ignore', '--no-index', '-q', '--', file], { cwd: root });
    assert.ok(result.status === 0 || result.status === 1, 'Git-Ignore-Prüfung konnte ausgeführt werden');
    return result.status === 0;
  }
  for (const file of ignored) assert.equal(ignoreStatus(file), true, `${file} muss ignoriert werden`);
  for (const file of kept) assert.equal(ignoreStatus(file), false, `${file} darf nicht ignoriert werden`);
});

test('Von Start führt die obere Richtung direkt zum Profil', async () => withPage(async page => {
  await press(page, 'ArrowUp');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'profile-button');
  await press(page, 'Enter');
  assert.equal(await page.locator('#connection-modal').isVisible(), true);
  await press(page, 'Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'profile-button');
  await press(page, 'ArrowLeft', 'ArrowDown', 'ArrowUp');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-page')), 'start');
}));
