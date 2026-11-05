'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createRelay } = require('../companion/relay.cjs');
const options = (body, token) => ({ method:'POST', headers: { 'content-type':'application/json', ...(token ? { authorization:'Bearer ' + token } : {}) }, body:JSON.stringify(body) });
test('Handy kann ohne Zugangsdaten browsen und Wiedergabe anfordern', async () => {
  const server = createRelay({ host:'127.0.0.1', port:0 }); await new Promise(r => server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base+'/api/pair', options({})); const pair = await response.json();
  const browser = await chromium.launch({ headless:true }); const page = await browser.newPage({ viewport:{width:390,height:844} });
  const tvHeaders = { authorization:'Bearer ' + pair.tvToken };
  async function waitForEvent(type) {
    for (let i=0; i<50; i++) { const r=await fetch(base+'/api/tv/events',{headers:tvHeaders}); const data=await r.json(); const found=data.events.find(event=>event.type===type); if(found) return found; await new Promise(r=>setTimeout(r,50)); }
    throw new Error('TV request not received');
  }
  try {
    await page.goto(base+'/#'+pair.pairToken); await page.waitForFunction(() => location.hash === '');
    assert.equal(await page.locator('#app').isVisible(), true);
    assert.equal(await page.locator('#connection').textContent(), 'Verbunden');
    assert.equal(await page.locator('.device-options').evaluate(el => el.open), false);
    const browse=await waitForEvent('browse'); assert.equal(browse.kind,'movies');
    await fetch(base+'/api/tv/events', options({type:'browse-result',id:browse.id,items:[{id:'film1',title:'Ein Film',kind:'movie'}],total:1},pair.tvToken));
    await page.getByRole('button',{name:'FILM Ein Film Auf Fernseher abspielen'}).waitFor();
    await page.setViewportSize({ width: 320, height: 700 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.getByRole('button',{name:'FILM Ein Film Auf Fernseher abspielen'}).click();
    const play=await waitForEvent('play'); assert.equal(play.itemId,'film1');
    await fetch(base+'/api/tv/events',options({type:'play-result',id:play.id,ok:true},pair.tvToken));
    await page.getByText('An den Fernseher gesendet.').waitFor();
    await page.locator('#people-tab').click(); await page.locator('#query').fill('Beispiel'); await page.locator('#search-form button').click();
    const people=await waitForEvent('browse'); assert.equal(people.kind,'people');
    await fetch(base+'/api/tv/events',options({type:'browse-result',id:people.id,items:[{id:'person1',title:'Person Beispiel',kind:'person'}],total:1},pair.tvToken));
    await page.getByRole('button',{name:'SCHAUSPIELER Person Beispiel Filme ansehen'}).click();
    const person=await waitForEvent('person'); assert.equal(person.personId,'person1');
    await fetch(base+'/api/tv/events',options({type:'person-result',id:person.id,items:[{id:'film2',title:'Ein zweiter Film',kind:'movie'}],total:1},pair.tvToken));
    await page.getByRole('button',{name:'FILM Ein zweiter Film Auf Fernseher abspielen'}).waitFor();
    assert.doesNotMatch(await page.content(), /access.?token/i);
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
});

test('Login-QR öffnet Smairys und wechselt nach TV-Freigabe automatisch zur Mediathek', async () => {
  const server = createRelay({host:'127.0.0.1',port:0}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true}); const page = await browser.newPage({viewport:{width:390,height:844}});
  let authorized = false, checks = 0;
  try {
    await page.route('**/api/claim', route=>route.fulfill({json:{mobileToken:'mobile-test',loginRequired:true}}));
    await page.route('**/api/mobile/login', async route=>{
      assert.equal(route.request().headers().authorization,'Bearer mobile-test');
      assert.deepEqual(route.request().postDataJSON(),{username:'Robin',password:'geheim'});
      authorized = true; await route.fulfill({json:{ok:true}});
    });
    await page.route('**/api/mobile/login-status', route=>route.fulfill({json:{ready:++checks > 1}}));
    await page.route('**/api/mobile/events', route=>route.fulfill({json:route.request().method()==='GET'?{events:[]}:{ok:true}}));
    await page.goto(base+'/#temporary');
    await page.locator('#login').waitFor();
    assert.equal(await page.evaluate(()=>location.hash),'');
    await page.locator('#login-user').fill('Robin'); await page.locator('#login-password').fill('geheim');
    await page.locator('#login-submit').click();
    await page.locator('#app').waitFor();
    assert.equal(authorized,true); assert.ok(checks>=2);
    assert.equal(await page.locator('#login-password').inputValue(),'');
    assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),'{}');
    assert.equal(await page.locator('#connection').textContent(),'Verbunden');
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
});

test('Kurzzeitiger Netzfehler verbindet erneut; fehlgeschlagene Suche und Wiedergabe bleiben bedienbar', async () => {
  const server = createRelay({host:'127.0.0.1',port:0}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true}); const page = await browser.newPage({viewport:{width:390,height:844}});
  let polls = 0, browses = 0, requests = [];
  try {
    await page.route('**/api/claim', route=>route.fulfill({json:{mobileToken:'mobile-test'}}));
    await page.route('**/api/mobile/events', route=>{
      if (route.request().method() === 'GET') {
        polls++;
        if (polls === 1) return route.abort('failed');
        return route.fulfill({json:{events:requests.splice(0)}});
      }
      const event=route.request().postDataJSON();
      if (event.type === 'browse') {
        browses++;
        if (browses === 1) return route.abort('failed');
        requests.push({type:'browse-result',id:event.id,items:[{id:'f1',title:'Film',kind:'movie'}],total:1});
        return route.fulfill({json:{ok:true}});
      }
      if (event.type === 'play') return route.abort('failed');
      return route.fulfill({json:{ok:true}});
    });
    await page.goto(base+'/#temporary');
    await page.getByRole('button',{name:'Erneut versuchen'}).waitFor();
    await page.getByRole('button',{name:'Erneut versuchen'}).click();
    const film=page.getByRole('button',{name:'FILM Film Auf Fernseher abspielen'});
    await film.waitFor();
    assert.ok(polls >= 2);
    assert.equal(await page.locator('#connection').textContent(),'Verbunden');
    await film.click();
    await page.getByText('Keine Antwort vom Fernseher.').waitFor();
    assert.equal(await film.isEnabled(),true);
    assert.equal(await page.locator('#failure').isVisible(),false);
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
});

test('Abgewiesene Anmeldeversuche erfordern einen neuen QR-Code', async () => {
  const server=createRelay({host:'127.0.0.1',port:0}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`, browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try {
    await page.route('**/api/claim',route=>route.fulfill({json:{mobileToken:'mobile-test',loginRequired:true}}));
    await page.route('**/api/mobile/login',route=>route.fulfill({status:429,json:{error:'too many attempts'}}));
    await page.goto(base+'/#temporary'); await page.locator('#login').waitFor();
    await page.locator('#login-user').fill('Robin'); await page.locator('#login-password').fill('test');
    await page.locator('#login-submit').click(); await page.getByText('Neuen QR-Code scannen.').waitFor();
    assert.equal(await page.locator('#login-submit').isDisabled(),true);
    assert.equal(await page.locator('#login-password').isDisabled(),true);
    assert.equal(await page.locator('#login-password').inputValue(),'');
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
});

test('Handyverbindung überlebt Reload im selben Tab und erlischt nach TV-Trennung', async () => {
  const server = createRelay({host:'127.0.0.1',port:0}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const pair=await (await fetch(base+'/api/pair', options({}))).json();
  const browser=await chromium.launch({headless:true}); const page=await browser.newPage();
  try {
    await page.goto(base+'/#'+pair.pairToken); await page.locator('#app').waitFor();
    const saved=await page.evaluate(()=>sessionStorage.getItem('smairys.connect.mobile'));
    assert.match(saved,/^[A-Za-z0-9_-]{43}$/);
    await page.reload(); await page.locator('#app').waitFor();
    assert.equal(await page.locator('#connection').textContent(),'Verbunden');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('smairys.connect.mobile')),saved);
    await fetch(base+'/api/tv/close', options({},pair.tvToken));
    await page.reload(); await page.locator('#failure').waitFor();
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('smairys.connect.mobile')),null);
    assert.equal(await page.locator('#app').isVisible(),false);
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
});

test('Abgelaufene und ungültige Sitzungsdaten öffnen Connect nicht', async () => {
  let now=1000;
  const server=createRelay({host:'127.0.0.1',port:0,now:()=>now}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const pair=await (await fetch(base+'/api/pair', options({}))).json();
  const browser=await chromium.launch({headless:true}); const page=await browser.newPage();
  try {
    await page.goto(base+'/#'+pair.pairToken); await page.locator('#app').waitFor();
    now+=61000;
    await page.reload(); await page.locator('#failure').waitFor();
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('smairys.connect.mobile')),null);
    await page.evaluate(()=>sessionStorage.setItem('smairys.connect.mobile','invalid'));
    await page.reload(); await page.locator('#failure').waitFor();
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('smairys.connect.mobile')),null);
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
});

test('Kopplung funktioniert auch ohne verfügbaren Tab-Speicher', async () => {
  const server=createRelay({host:'127.0.0.1',port:0}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const pair=await (await fetch(base+'/api/pair', options({}))).json();
  const browser=await chromium.launch({headless:true}); const page=await browser.newPage();
  try {
    await page.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw new Error('storage unavailable');}});});
    await page.goto(base+'/#'+pair.pairToken); await page.locator('#app').waitFor();
    await page.reload(); await page.locator('#failure').waitFor();
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
});
