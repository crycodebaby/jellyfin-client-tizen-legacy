'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');

async function fixture() {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(serverAddress => {
    if (!localStorage.getItem('smairys.connection')) {
      localStorage.setItem('smairys.connection', JSON.stringify({ server: serverAddress, username: '', password: '' }));
    }
  }, base);
  await page.route('**/Items?*', route => route.fulfill({ json: { Items: [], StartIndex: 0, TotalRecordCount: 0 } }));
  return { page, base, close: async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); } };
}

test('Login-Start: Passwortanmeldung und erneuter Start mit derselben Sitzung', async () => {
  const f = await fixture(); const { page, base } = f;
  let logins = 0, restores = 0;
  try {
    await page.route('**/QuickConnect/Initiate', route => route.fulfill({ status: 503 }));
    await page.route('**/Users/AuthenticateByName', route => {
      logins += 1;
      assert.deepEqual(route.request().postDataJSON(), { Username: 'Robin', Pw: 'test-only' });
      return route.fulfill({ json: { AccessToken: 'test-token', User: { Id: 'user', Name: 'Robin' } } });
    });
    await page.route('**/Users/user', route => { restores += 1; return route.fulfill({ json: { Id: 'user', Name: 'Robin' } }); });
    await page.clock.setFixedTime(new Date('2026-10-31T10:00:00'));
    await page.goto(base);
    await page.locator('#login-view').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#login-user').isVisible(), true);
    assert.equal(await page.locator(':focus').getAttribute('id'), 'login-submit');
    await page.locator('#login-user').focus();
    assert.equal(await page.locator('#login-view').evaluate(e => e.classList.contains('is-editing')), true);
    await page.setViewportSize({width:1920,height:600});
    assert.equal(await page.locator('#app').evaluate(e => e.style.transform), 'scale(1)');
    await page.setViewportSize({width:1920,height:1080});
    await page.locator('#login-user').fill('Robin');
    await page.locator('#login-password').fill('test-only');
    await page.locator('#login-submit').click();
    await page.locator('#login-view').waitFor({ state: 'hidden' });
    assert.equal(logins, 1);
    await page.waitForFunction(() => document.getElementById('home-resume').parentNode.style.display === 'none');
    assert.match(await page.locator('#home-greeting').textContent(), /Guten Morgen, Robin/);
    assert.ok((await page.locator('#home-greeting-detail').textContent()).trim());
    assert.equal(await page.locator('#profile-button-name').textContent(), 'Robin');
    assert.equal(await page.locator('#profile-button .profile-chevron').count(), 1);
    assert.ok(await page.evaluate(() => localStorage.getItem('smairys.session')));
    const connection = JSON.parse(await page.evaluate(() => localStorage.getItem('smairys.connection')));
    assert.ok(!connection.password, 'Das Passwort darf nach dem Login nicht dauerhaft gespeichert sein');
    await page.reload();
    await page.locator('#login-view').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.getElementById('auth-logout').style.display !== 'none');
    assert.equal(restores, 1);
    assert.equal(logins, 1, 'Die Wiederherstellung darf keine zweite Passwortanmeldung auslösen');
  } finally { await f.close(); }
});

test('Quick Connect: QR enthält nur den Bestätigungscode und TV tauscht sein Geheimnis getrennt ein', async () => {
  const f = await fixture(); const { page, base } = f;
  let qrRequest, exchanged = false, allowAuthorization = false;
  try {
    await page.route('**/QuickConnect/Initiate', route => route.fulfill({ json: { Code: '123456', Secret: 'tv-secret', Authenticated: false } }));
    await page.route('**/QuickConnect/Connect?*', route => route.fulfill({ json: { Secret: 'tv-secret', Authenticated: allowAuthorization } }));
    await page.route('**/Users/AuthenticateWithQuickConnect', route => {
      assert.equal(allowAuthorization, true);
      assert.deepEqual(route.request().postDataJSON(), { Secret: 'tv-secret' });
      exchanged = true;
      return route.fulfill({ json: { AccessToken: 'test-token', User: { Id: 'user', Name: 'Robin' } } });
    });
    await page.route('**/api/tv/quick-connect-qr', route => {
      qrRequest = route.request().postDataJSON();
      return route.fulfill({ json: { svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', tvToken: 'a'.repeat(43) }, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await page.goto(base);
    await page.locator('#login-view').waitFor({ state: 'visible' });
    await page.locator('#login-qr').waitFor({ state: 'visible' });
    assert.ok(qrRequest, 'Der TV fordert einen QR-Code beim Relay an');
    assert.match(JSON.stringify(qrRequest), /123456/);
    assert.doesNotMatch(JSON.stringify(qrRequest), /tv-secret|test-token/);
    assert.match(await page.locator('#login-qr').getAttribute('src'), /^data:image\/svg\+xml/);
    assert.equal(exchanged, false, 'Vor Freigabe darf keine Anmeldung stattfinden');
    allowAuthorization = true;
    await page.locator('#login-view').waitFor({ state: 'hidden', timeout: 10000 });
    assert.equal(exchanged, true);
    assert.ok(await page.evaluate(() => localStorage.getItem('smairys.session')));
  } finally { await f.close(); }
});

test('Fehlender QR-Dienst blockiert die Anmeldung mit Passwort nicht', async () => {
  const f = await fixture(); const { page, base } = f;
  try {
    await page.route('**/QuickConnect/Initiate', route => route.fulfill({ json: { Code: '123456', Secret: 'tv-secret', Authenticated: false } }));
    await page.route('**/QuickConnect/Connect?*', route => route.fulfill({ json: { Secret: 'tv-secret', Authenticated: false } }));
    await page.route('**/api/tv/quick-connect-qr', route => route.fulfill({ status: 503, json: { error: 'offline' }, headers: { 'Access-Control-Allow-Origin': '*' } }));
    await page.route('**/Users/AuthenticateByName', route => route.fulfill({ json: { AccessToken: 'test-token', User: { Id: 'user', Name: 'Robin' } } }));
    await page.goto(base);
    await page.locator('#login-view').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.getElementById('login-qr-status').textContent.indexOf('nicht verfügbar') !== -1);
    assert.equal(await page.locator('#login-code').textContent(), '123456');
    await page.locator('#login-user').fill('Robin');
    await page.locator('#login-password').fill('test-only');
    await page.locator('#login-submit').click();
    await page.locator('#login-view').waitFor({ state: 'hidden' });
    assert.ok(await page.evaluate(() => localStorage.getItem('smairys.session')));
  } finally { await f.close(); }
});

test('Zurückgewiesenes Passwort bleibt auf der Anmeldung und wird aus dem Eingabefeld entfernt', async () => {
  const f = await fixture(); const { page, base } = f;
  try {
    await page.route('**/QuickConnect/Initiate', route => route.fulfill({ status: 503 }));
    await page.route('**/Users/AuthenticateByName', route => route.fulfill({ status: 401 }));
    await page.goto(base);
    await page.locator('#login-view').waitFor({ state: 'visible' });
    await page.locator('#login-user').fill('Robin');
    await page.locator('#login-password').fill('wrong');
    await page.locator('#login-submit').click();
    await page.waitForFunction(() => document.getElementById('login-status').textContent.indexOf('Zugangsdaten') !== -1);
    assert.equal(await page.locator('#login-view').isVisible(), true);
    assert.equal(await page.locator('#login-password').inputValue(), '');
    assert.equal(await page.evaluate(() => localStorage.getItem('smairys.session')), null);
  } finally { await f.close(); }
});

test('Verbindungsfehler entfernt alten QR und bietet erneuten Versuch', async () => {
  const f = await fixture(); const { page } = f;
  try {
    await page.route('**/QuickConnect/Initiate', route => route.fulfill({json:{Code:'123456',Secret:'test-secret',Authenticated:false}}));
    await page.route('**/QuickConnect/Connect?*', route => route.fulfill({status:503}));
    await page.route('**/api/tv/quick-connect-qr', route => route.fulfill({json:{svg:'<svg xmlns="http://www.w3.org/2000/svg"></svg>',tvToken:'a'.repeat(43)},headers:{'Access-Control-Allow-Origin':'*'}}));
    await page.goto(f.base);
    await page.locator('#login-qr').waitFor({state:'visible'});
    await page.locator('#login-qr-retry').waitFor({state:'visible',timeout:6000});
    assert.equal(await page.locator('#login-qr').isVisible(),false);
    assert.equal(await page.locator('#login-code').textContent(),'');
  } finally { await f.close(); }
});

test('Doppeltes Anmelden startet nur eine Anfrage', async () => {
  const f = await fixture(); const { page } = f; let calls = 0;
  try {
    await page.route('**/QuickConnect/Initiate', route => route.fulfill({status:503}));
    await page.route('**/Users/AuthenticateByName', async route => { calls++; await new Promise(r=>setTimeout(r,400)); await route.fulfill({status:401}); });
    await page.goto(f.base);
    await page.locator('#login-user').fill('Robin'); await page.locator('#login-password').fill('test');
    await page.locator('#login-submit').click(); await page.locator('#login-submit').click();
    await page.getByText('Zugangsdaten prüfen.').waitFor();
    assert.equal(calls,1);
    assert.equal(await page.locator('#login-user').evaluate(el=>el.readOnly),false);
  } finally { await f.close(); }
});

test('Gespeicherte Sitzung wird nach kurzem Serverausfall erneut geprüft', async () => {
  const f = await fixture(); const { page } = f; let restores = 0;
  try {
    await page.route('**/QuickConnect/Initiate', route => route.fulfill({status:503}));
    await page.route('**/Users/AuthenticateByName', route => route.fulfill({json:{AccessToken:'token',User:{Id:'user',Name:'Robin'}}}));
    await page.route('**/Users/user', route => { restores++; return restores === 1 ? route.fulfill({status:503}) : route.fulfill({json:{Id:'user',Name:'Robin'}}); });
    await page.goto(f.base);
    await page.locator('#login-user').fill('Robin'); await page.locator('#login-password').fill('test'); await page.locator('#login-submit').click();
    await page.locator('#login-view').waitFor({state:'hidden'});
    await page.reload();
    await page.getByText('Server nicht erreichbar.', {exact:true}).waitFor();
    await page.locator('#login-view').waitFor({state:'hidden',timeout:12000});
    assert.equal(restores,2);
  } finally { await f.close(); }
});
