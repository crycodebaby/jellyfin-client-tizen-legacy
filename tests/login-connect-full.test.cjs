'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');
const { createRelay } = require('../companion/relay.cjs');

test('Ein QR-Scan meldet den TV an und öffnet anschließend Smairys Connect', async () => {
  let scanned = '', approved = false, exchanges = 0, claimToken = '';
  const jellyfin = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/Users/AuthenticateByName') {
      let body = ''; req.on('data', c => body += c); req.on('end', () => {
        const data = JSON.parse(body);
        if (data.Username !== 'Robin' || data.Pw !== 'test-only') { res.writeHead(401); res.end('{}'); return; }
        res.end(JSON.stringify({ AccessToken:'phone-test-token', User:{ Id:'user', Name:'Robin' } }));
      }); return;
    }
    if (req.url === '/QuickConnect/Authorize?code=123456') {
      assert.match(req.headers.authorization || '', /phone-test-token/);
      approved = true; res.end('true'); return;
    }
    if (req.url === '/Sessions/Logout') { res.end('null'); return; }
    res.writeHead(404); res.end('{}');
  });
  const preview = createPreviewServer();
  const relay = createRelay({host:'127.0.0.1',port:0,renderQr:(link, cb) => { scanned = link; cb(null, '<svg xmlns="http://www.w3.org/2000/svg"></svg>'); }});
  await Promise.all([new Promise(r => jellyfin.listen(0,'127.0.0.1',r)), new Promise(r => preview.listen(0,'127.0.0.1',r)), new Promise(r => relay.listen(0,'127.0.0.1',r))]);
  const base = `http://127.0.0.1:${jellyfin.address().port}`;
  const relayBase = `http://127.0.0.1:${relay.address().port}`;
  const browser = await chromium.launch({ headless:true });
  const tv = await browser.newPage({viewport:{width:1920,height:1080}});
  const phone = await browser.newPage({viewport:{width:390,height:844}});
  try {
    await tv.addInitScript(server => localStorage.setItem('smairys.connection', JSON.stringify({server,username:'',password:''})), base);
    await tv.route('http://127.0.0.1:8787/**', async route => {
      const request = route.request(), url = new URL(request.url()), headers = {...request.headers(), origin:'null'};
      delete headers.host; delete headers['content-length'];
      const response = await fetch(relayBase + url.pathname + url.search, {method:request.method(),headers,body:request.postData() || undefined});
      await route.fulfill({status:response.status,body:await response.text(),headers:{'content-type':'application/json','access-control-allow-origin':'*'}});
    });
    await tv.route('**/QuickConnect/Initiate', route => route.fulfill({json:{Code:'123456',Secret:'tv-secret',Authenticated:false}}));
    await tv.route('**/QuickConnect/Connect?*', route => route.fulfill({json:{Secret:'tv-secret',Authenticated:approved}}));
    await tv.route('**/Users/AuthenticateWithQuickConnect', route => {
      assert.equal(approved, true); exchanges++;
      assert.deepEqual(route.request().postDataJSON(), {Secret:'tv-secret'});
      return route.fulfill({json:{AccessToken:'tv-test-token',User:{Id:'user',Name:'Robin'}}});
    });
    await tv.route('**/Items?*', route => route.fulfill({json:{Items:[{Id:'film1',Name:'Ein Film'}],StartIndex:0,TotalRecordCount:1}}));
    phone.on('response', async response => {
      if (response.url().endsWith('/api/claim') && response.ok()) { try { claimToken = (await response.json()).mobileToken; } catch (_) {} }
    });
    await tv.goto(`http://127.0.0.1:${preview.address().port}`);
    await tv.locator('#login-qr').waitFor({state:'visible'});
    assert.match(scanned, /^http:\/\/127\.0\.0\.1:\d+\/#/);
    assert.doesNotMatch(scanned, /123456|tv-secret|tv-test-token/);
    await phone.goto(scanned);
    await phone.locator('#login').waitFor({state:'visible'});
    await phone.waitForFunction(() => !location.hash);
    for (let i=0; !claimToken && i<50; i++) await new Promise(r=>setTimeout(r,20));
    assert.ok(claimToken);
    const reused = await fetch(relayBase + '/api/claim', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pairToken:new URL(scanned).hash.slice(1)})});
    assert.equal(reused.status,401, 'Der QR-Code kann nur einmal beansprucht werden');
    const blocked = await fetch(relayBase + '/api/mobile/events', {headers:{Authorization:'Bearer '+claimToken}});
    assert.equal(blocked.status,403, 'Vor der Freigabe sind Connect-Nachrichten gesperrt');
    assert.equal(exchanges,0);
    await phone.locator('#login-user').fill('Robin');
    await phone.locator('#login-password').fill('wrong');
    await phone.locator('#login-submit').click();
    await phone.getByText('Anmeldung fehlgeschlagen. Bitte erneut versuchen.').waitFor();
    assert.equal(await phone.locator('#login-password').inputValue(), '');
    assert.equal(await phone.locator('#app').isVisible(),false);
    assert.equal(exchanges,0);
    await phone.locator('#login-password').fill('test-only');
    await phone.locator('#login-submit').click();
    await tv.locator('#login-view').waitFor({state:'hidden',timeout:10000});
    await phone.locator('#app').waitFor({state:'visible',timeout:10000});
    assert.equal(approved,true); assert.equal(exchanges,1);
    assert.equal(await phone.locator('#login-password').inputValue(), '');
    await phone.getByText('Ein Film', {exact:true}).waitFor({timeout:10000});
    assert.ok(await tv.evaluate(() => localStorage.getItem('smairys.session')));
  } finally {
    await browser.close();
    await Promise.all([new Promise(r=>relay.close(r)),new Promise(r=>preview.close(r)),new Promise(r=>jellyfin.close(r))]);
  }
});
