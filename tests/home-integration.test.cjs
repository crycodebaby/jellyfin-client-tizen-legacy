'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');

test('Startseite lädt Filmverlauf seitenweise und erhält den Fokus bei Rückkehr', async () => {
  const server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.addInitScript(() => { window.webapis = { avplay: { state: 'NONE', open() { this.state = 'IDLE'; }, close() { this.state = 'NONE'; }, stop() { this.state = 'IDLE'; }, setListener(listener) { this.listener = listener; }, setDisplayRect() {}, prepareAsync(ok) { this.state = 'READY'; setTimeout(ok, 0); }, play() { this.state = 'PLAYING'; }, pause() { this.state = 'PAUSED'; }, seekTo(ms, ok) { setTimeout(ok, 0); }, getState() { return this.state; }, getCurrentTime() { return 45000; }, getDuration() { return 120000; }, getTotalTrackInfo() { return []; }, getCurrentStreamInfo() { return []; } } }; });
    let stoppedRoute;
    let resumeCalls = 0;
    let delayResume = false;
    let delayedResume;
    await page.route('**/Users/AuthenticateByName', (route) => route.fulfill({ json: { AccessToken: 'token', User: { Id: 'user', Name: 'Test' } } }));
    await page.route('**/Items?*', (route) => {
      const params = new URL(route.request().url()).searchParams;
      if (params.get('sortBy') === 'DateCreated') {
        return route.fulfill({ json: { Items: [{ Id: 'new-movie', Name: 'Neuer Film 1080p WEB-DL' }], StartIndex: 0, TotalRecordCount: 1 } });
      }
      if (params.get('filters') !== 'IsResumable') return route.fulfill({ json: { Items: [], StartIndex: 0, TotalRecordCount: 0 } });
      resumeCalls += 1;
      const start = Number(params.get('startIndex'));
      const items = Array.from({ length: Math.min(5, 7 - start) }, (_, i) => ({ Id: `m${start + i}`, Name: `Film ${start + i}`, ProductionYear: 2015, UserData: { PlayedPercentage: 30 } }));
      if (delayResume) { delayedResume = () => route.fulfill({ json: { Items: items, StartIndex: start, TotalRecordCount: 7 } }); return; }
      return route.fulfill({ json: { Items: items, StartIndex: start, TotalRecordCount: 7 } });
    });
    await page.route('**/Users/user/Items/m5', (route) => route.fulfill({ json: { Id: 'm5', Name: 'Film 5', People: [{ Id: 'actor', Name: 'Person', Type: 'Actor' }] } }));
    await page.route('**/Items/*/PlaybackInfo', (route) => route.fulfill({ json: { PlaySessionId: 'session', MediaSources: [{ Id: 'source', SupportsDirectPlay: true }] } }));
    await page.route('**/Sessions/Playing/Stopped', (route) => { stoppedRoute = route; });
    await page.route('**/Sessions/Playing', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto(base + '/?preview=1');
    await page.locator('#profile-button').click(); await page.locator('#settings-open').click(); await page.locator('#server-url').fill(base); await page.locator('#settings-back').click();
    await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Test'); await page.locator('#auth-password').fill('password'); await page.locator('#auth-submit').click();
    await page.locator('[data-page="start"]').click();
    await page.locator('#home-resume [data-movie-id="m0"]').waitFor();
    assert.equal(await page.locator('#preview-hero').isVisible(), false);
    assert.equal(await page.locator('#home-recent-status').textContent(), 'Noch keine Filme gesehen.');
    assert.equal(await page.locator('#home-resume .home-progress').count(), 5);
    assert.equal(await page.locator('#home-resume .poster .release-year').count(), 0);
    assert.equal(await page.locator('#home-resume .card-title + .release-year').first().textContent(), '2015');
    await page.locator('#home-latest button').waitFor();
    assert.equal(await page.locator('#home-latest .card-title').textContent(), 'Neuer Film');
    assert.equal(await page.locator('#home-latest .release-year').count(), 0);
    await page.locator('#home-resume .card-title').nth(0).evaluate((node) => { node.textContent = 'Geschichten von den fernen Blumeninseln'; });
    const homeTitle = await page.locator('#home-resume .card-title').nth(0).evaluate((node) => ({ fits: node.scrollHeight <= node.clientHeight, lines: node.clientHeight / parseFloat(getComputedStyle(node).lineHeight), bottom: node.getBoundingClientRect().bottom }));
    const nextRail = await page.locator('#home-latest').evaluate((node) => node.parentNode.getBoundingClientRect().top);
    assert.ok(homeTitle.fits && homeTitle.lines > 1 && homeTitle.bottom < nextRail, 'Lange Titel umbrechen ohne Überlappung auf der Startseite');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-zone'), 'home-latest');
    assert.ok(await page.evaluate(() => {
      const library = document.getElementById('home-library');
      const header = document.querySelector('.topbar').getBoundingClientRect();
      const viewport = library.getBoundingClientRect();
      const focusedCard = document.activeElement.getBoundingClientRect();
      return library.scrollTop > 0 && viewport.top >= header.bottom &&
        focusedCard.top >= viewport.top && focusedCard.bottom <= viewport.bottom;
    }), 'Die gewählte Karte bleibt vollständig im Scrollbereich unter der Kopfzeile');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'm0');
    assert.equal(await page.locator('#home-library').evaluate(node => node.scrollTop), 0);
    for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.activeElement.getAttribute('data-movie-id') === 'm5');
    await page.keyboard.press('Enter'); await page.locator('[data-actor-id="actor"]').waitFor();
    await page.locator('[data-actor-id="actor"]').click();
    await page.keyboard.press('Escape');
    await page.locator('#detail-modal').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#detail-title').textContent(), 'Film 5');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'm5');
    await page.keyboard.press('Enter'); await page.locator('#play-button').click();
    await page.waitForFunction(() => document.getElementById('player-status').textContent === 'Wiedergabe');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement.getAttribute('data-movie-id') === 'm5');
    await assertEventually(() => stoppedRoute);
    const beforeAck = resumeCalls;
    delayResume = true;
    await stoppedRoute.fulfill({ status: 204, body: '' });
    await assertEventually(() => resumeCalls > beforeAck);
    await assertEventually(() => delayedResume);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('data-movie-id'), 'm6');
    await delayedResume();
    await page.waitForFunction(() => document.activeElement.getAttribute('data-movie-id') === 'm6');
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});

async function assertEventually(predicate) {
  for (let i = 0; i < 100; i += 1) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 20)); }
  assert.fail('Erwarteter asynchroner Zustand wurde nicht erreicht');
}

test('Zuletzt aus Sammlung gestarteter Film erzeugt profilbezogene Startverknüpfung', async () => {
 const server=createPreviewServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080}});let watched=false;
 try {
  await page.addInitScript(()=>{window.webapis={avplay:{state:'NONE',open(){this.state='IDLE'},close(){this.state='NONE'},stop(){this.state='IDLE'},setListener(){},setDisplayRect(){},prepareAsync(ok){this.state='READY';setTimeout(ok,0)},play(){this.state='PLAYING'},pause(){this.state='PAUSED'},seekTo(ms,ok){setTimeout(ok,0)},getState(){return this.state},getCurrentTime(){return 20000},getDuration(){return 120000},getTotalTrackInfo(){return[]},getCurrentStreamInfo(){return[]}}}});
  await page.route('**/Users/AuthenticateByName',r=>r.fulfill({json:{AccessToken:'token',User:{Id:'user',Name:'Test'}}}));
  await page.route('**/Genres?*',r=>r.fulfill({json:{Items:[],StartIndex:0,TotalRecordCount:0}}));
  await page.route('**/Items?*',r=>{const q=new URL(r.request().url()).searchParams;let items=q.get('includeItemTypes')==='BoxSet'?[{Id:'col1',Name:'Filmreihe'}]:(q.get('parentId')==='col1'?[{Id:'film1',Name:'Film'}]:(watched && (q.get('isPlayed')==='true'||q.get('filters')==='IsResumable')?[{Id:'film1',Name:'Film'}]:[]));return r.fulfill({json:{Items:items,StartIndex:Number(q.get('startIndex')),TotalRecordCount:items.length}})});
  await page.route('**/Users/user/Items/film1',r=>r.fulfill({json:{Id:'film1',Name:'Film',People:[],UserData:{}}}));await page.route('**/Items/*/PlaybackInfo',r=>r.fulfill({json:{PlaySessionId:'s',MediaSources:[{Id:'source',SupportsDirectPlay:true}]}}));await page.route('**/Sessions/Playing**',r=>{watched=true;return r.fulfill({status:204,body:''})});
  await page.goto(base+'/?preview=1');await page.locator('#profile-button').click();await page.locator('#settings-open').click();await page.locator('#server-url').fill(base);await page.locator('#settings-back').click();await page.locator('#auth-open').click();await page.locator('#auth-user').fill('Test');await page.locator('#auth-password').fill('test');await page.locator('#auth-submit').click();await page.locator('[data-page="sammlungen"]').click();await page.locator('[data-action="collection-open"]').click();await page.locator('[data-movie-id="film1"]').first().click();await page.locator('#play-button').click();await page.waitForFunction(()=>document.getElementById('player-status').textContent==='Wiedergabe',null,{timeout:5000}).catch(async e=>{throw new Error('Playerstatus: '+await page.locator('#player-status').textContent()+' / Detail: '+await page.locator('#detail-footnote').textContent())});await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.locator('[data-page="start"]').click();await page.locator('#home-collection').waitFor({state:'visible'});assert.match(await page.locator('#home-collection').textContent(),/Filmreihe/);await page.locator('#home-collection').click();await page.locator('#section-cards [data-movie-id="film1"]').first().waitFor();assert.equal(await page.locator('#page-title').textContent(),'Filmreihe');
 } finally {await browser.close();await new Promise(r=>server.close(r));}
});

test('Startseiten-Tipp öffnet eine Person aus einem vorhandenen Film und kehrt zurück', async () => {
  const server = createPreviewServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true}); const page = await browser.newPage({viewport:{width:1920,height:1080}});
  try {
    await page.route('**/Users/AuthenticateByName', route => route.fulfill({json:{AccessToken:'token',User:{Id:'user',Name:'Robin'}}}));
    await page.route('**/Items?*', route => {const p=new URL(route.request().url()).searchParams; const items=p.get('filters')==='IsResumable'||p.get('filters')==='IsPlayed' ? [] : [{Id:'movie-1',Name:'Film'}]; return route.fulfill({json:{Items:items,StartIndex:Number(p.get('startIndex')),TotalRecordCount:items.length}});});
    await page.route('**/Users/user/Items/movie-1', route => route.fulfill({json:{Id:'movie-1',Name:'Film',People:[{Id:'person-1',Name:'Darsteller',Type:'Actor'}]}}));
    await page.route('**/Users/user/Items/person-1', route => route.fulfill({json:{Id:'person-1',Name:'Darsteller'}}));
    await page.goto(base+'/?preview=1'); await page.locator('#profile-button').click(); await page.locator('#settings-open').click(); await page.locator('#server-url').fill(base); await page.locator('#settings-back').click(); await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Robin'); await page.locator('#auth-password').fill('password'); await page.locator('#auth-submit').click();
    await page.locator('[data-page="start"]').click(); await page.locator('#home-actor').waitFor({state:'visible'}); assert.match(await page.locator('#home-actor').textContent(),/Darsteller/);
    await page.locator('#home-greeting').evaluate(node => {
      node.textContent = 'Warum können Geister so schlecht lügen, obwohl sie sich jede Ausrede der Welt ausdenken können?';
    });
    assert.ok(await page.evaluate(() => {
      const heading = document.getElementById('home-greeting');
      const button = document.getElementById('home-actor');
      const detail = document.getElementById('home-greeting-detail');
      const headingBox = heading.getBoundingClientRect();
      const welcomeBox = document.querySelector('.home-welcome').getBoundingClientRect();
      return headingBox.height > parseFloat(getComputedStyle(heading).lineHeight) &&
        heading.scrollWidth <= heading.clientWidth &&
        headingBox.right < button.getBoundingClientRect().left &&
        detail.getBoundingClientRect().bottom < welcomeBox.bottom;
    }), 'Lange Fragen umbrechen neben der Aktion und lassen Platz für die Pointe');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('data-zone'), 'home-latest');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'home-actor');
    await page.locator('#home-actor').click(); assert.equal(await page.locator('#person-name').textContent(),'Darsteller'); await page.keyboard.press('Escape'); assert.equal(await page.locator('#home-library').isVisible(),true);
  } finally { await page.close(); await browser.close(); await new Promise(resolve=>server.close(resolve)); }
});
