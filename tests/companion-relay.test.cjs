'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRelay, quickConnectLink } = require('../companion/relay.cjs');
async function withRelay(fn, options = {}) {
  const server = createRelay({ host: '127.0.0.1', port: 0, ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, options = {}) {
    const response = await fetch(base + path, options);
    const body = await response.text();
    return { status: response.status, body, headers: response.headers, json() { return JSON.parse(body); } };
  }
  try { await fn(request, base); } finally { await new Promise((resolve) => server.close(resolve)); }
}
function post(value, bearer) { return { method: 'POST', headers: { 'content-type': 'application/json', ...(bearer ? { authorization: 'Bearer ' + bearer } : {}) }, body: JSON.stringify(value) }; }
test('Quick-Connect-QR erlaubt nur einen eindeutigen lokalen Jellyfin-Webpfad', () => {
  assert.equal(quickConnectLink('127.0.0.1', 'http://127.0.0.1:8096', '123456'), 'http://127.0.0.1:8096/web/#/quickconnect?code=123456');
  assert.equal(quickConnectLink('127.0.0.1', 'https://127.0.0.1:8920/jellyfin/', 'A12B34'), 'https://127.0.0.1:8920/jellyfin/web/#/quickconnect?code=A12B34');
  for (const server of ['http://evil.invalid:8096', 'http://127.0.0.1.evil.invalid:8096', 'http://user:pass@127.0.0.1:8096', 'http://127.0.0.1:8096/?x=1', 'http://127.0.0.1:8096/#x', 'file:///tmp', 'http://127.0.0.1:99999', 'http://127.0.0.1/%2e%2e', 'http://127.0.0.1/hello world', 'http://127.0.0.1/evil\\path']) assert.equal(quickConnectLink('127.0.0.1', server, '123456'), null, server);
  for (const code of ['12345','1234567','12&456','12 456','ä12345',null]) assert.equal(quickConnectLink('127.0.0.1','http://127.0.0.1:8096',code),null);
});

test('Quick-Connect-QR weist fremde Origins und unzulässige Eingaben vor der Erzeugung ab', () => withRelay(async (request, base) => {
  const path = '/api/tv/quick-connect-qr';
  const preflight = await request(path, {method:'OPTIONS', headers:{origin:'null', 'access-control-request-method':'POST', 'access-control-request-headers':'content-type'}});
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'null');
  assert.equal((await request(path, {...post({server:'http://127.0.0.1:8096',code:'123456'}), headers:{'content-type':'application/json',origin:base}})).status,403);
  assert.equal((await request(path, {...post({server:'http://127.0.0.1:8096',code:'123456'}), headers:{'content-type':'application/json',origin:'https://evil.invalid'}})).status,403);
  for (const payload of [{server:'http://evil.invalid',code:'123456'}, {server:'http://127.0.0.1:8096',code:'12345'}, {server:'http://127.0.0.1:8096',code:'123456',secret:'secret'}, {server:'http://127.0.0.1:8096'}]) assert.equal((await request(path,post(payload))).status,400);
}));

test('Quick-Connect-QR wird ohne TV-Sitzung lokal für HTTP und HTTPS erzeugt', async t => {
  const python = process.env.SMAIRYS_QR_PYTHON;
  if (!python) return t.skip('SMAIRYS_QR_PYTHON nicht gesetzt');
  await withRelay(async request => {
    for (const server of ['http://127.0.0.1:8096', 'https://127.0.0.1:8920/jellyfin']) {
      const response = await request('/api/tv/quick-connect-qr', {...post({server,code:'123456'}), headers:{'content-type':'application/json',origin:'null'}});
      assert.equal(response.status,200); assert.equal(response.headers.get('access-control-allow-origin'),'null'); assert.match(response.json().svg,/^<svg[\s>]/); assert.equal(response.body.includes('123456'),false);
    }
  }, {python});
});
test('Kopplung ist einmalig und Nachrichten sind begrenzt', () => withRelay(async (request) => {
  const pair = (await request('/api/pair', post({}))).json();
  assert.match(pair.tvToken, /^[A-Za-z0-9_-]{43}$/); assert.match(pair.pairToken, /^[A-Za-z0-9_-]{43}$/);
  const claim = await request('/api/claim', post({ pairToken: pair.pairToken })); assert.equal(claim.status, 200);
  const mobile = claim.json().mobileToken; assert.notEqual(mobile, pair.tvToken);
  assert.equal((await request('/api/claim', post({ pairToken: pair.pairToken }))).status, 401);
  const image = { type:'browse-result', id:'b1', items:[{ id:'film1', title:'Film', kind:'movie', imageUrl:'http://127.0.0.1:8096/Items/film1/Images/Primary?maxWidth=360&tag=abc' }], total:1 };
  assert.equal((await request('/api/tv/events', post(image, pair.tvToken))).status, 200);
  assert.equal((await request('/api/mobile/events', { headers:{ authorization:'Bearer '+mobile } })).json().events[0].items[0].imageUrl, image.items[0].imageUrl);
  const event = { type: 'play', id: 'r1', itemId: 'film1' };
  assert.equal((await request('/api/mobile/events', post(event, mobile))).status, 200);
  assert.deepEqual((await request('/api/tv/events', { headers: { authorization: 'Bearer ' + pair.tvToken } })).json().events, [event]);
  assert.equal((await request('/api/mobile/events', post({ ...event, url: 'http://bad.invalid' }, mobile))).status, 400);
  assert.equal((await request('/api/tv/close', post({}, pair.tvToken))).status, 200);
  assert.equal((await request('/api/mobile/events', { headers: { authorization: 'Bearer ' + mobile } })).status, 401);
}));
test('Webdateien sind lokal verfügbar und fremde Origins werden abgewiesen', () => withRelay(async (request, base) => {
  for (const path of ['/', '/app.js', '/styles.css']) { const result = await request(path); assert.equal(result.status, 200); assert.match(result.headers.get('cache-control'), /no-store/); }
  assert.equal((await request('/api/pair', { ...post({}), headers: { 'content-type': 'application/json', origin: 'http://untrusted.invalid' } })).status, 403);
  assert.equal((await request('/api/claim', { ...post({ pairToken: 'x' }), headers: { 'content-type': 'application/json', origin: base } })).status, 401);
}));
test('Abgelaufene Verbindungen können nicht beansprucht werden', () => { let time = 1000; return withRelay(async (request) => {
  const pair = (await request('/api/pair', post({}))).json(); time += 3000;
  assert.equal((await request('/api/claim', post({ pairToken: pair.pairToken }))).status, 401);
  assert.equal((await request('/api/tv/events', { headers: { authorization: 'Bearer ' + pair.tvToken } })).status, 401);
}, { ttl: 2000, now: () => time }); });

test('QR wird lokal erzeugt und nach einmaliger Kopplung ungültig', async (t) => {
  const python = process.env.SMAIRYS_QR_PYTHON;
  if (!python) return t.skip('SMAIRYS_QR_PYTHON nicht gesetzt');
  await withRelay(async (request) => {
    const pair = (await request('/api/pair', post({}))).json();
    const qr = await request('/api/tv/qr', { headers: { authorization: 'Bearer ' + pair.tvToken } });
    assert.equal(qr.status, 200); assert.match(qr.json().svg, /^<svg[\s>]/); assert.equal(qr.body.includes(pair.pairToken), false);
    assert.equal((await request('/api/claim', post({ pairToken:pair.pairToken }))).status, 200);
    assert.equal((await request('/api/tv/qr', { headers:{ authorization:'Bearer '+pair.tvToken } })).status, 401);
  }, {python});
});

test('Inaktive TV-Verbindung läuft ab und fremde Bilder werden zurückgewiesen', () => { let time=1000; return withRelay(async request => {
 const p=(await request('/api/pair',post({}))).json(), m=(await request('/api/claim',post({pairToken:p.pairToken}))).json().mobileToken;
 assert.equal((await request('/api/tv/events',post({type:'browse-result',id:'r1',items:[{id:'film1',title:'Film',kind:'movie',imageUrl:'https://untrusted.invalid/Items/film1/Images/Primary'}],total:1},p.tvToken))).status,400);
 time+=61000; assert.equal((await request('/api/mobile/events',{headers:{authorization:'Bearer '+m}})).status,401);
}, { now:()=>time }); });

test('Gerätenamen sind begrenzt, nur mit gültiger Handy-Berechtigung änderbar und für den TV sichtbar', () => withRelay(async (request) => {
  const pair = (await request('/api/pair', post({}))).json();
  assert.equal((await request('/api/claim', post({pairToken:pair.pairToken, deviceName:'x'.repeat(41)}))).status, 400);
  const mobile = (await request('/api/claim', post({pairToken:pair.pairToken, deviceName:'iPhone'}))).json().mobileToken;
  const headers = {authorization:'Bearer ' + pair.tvToken};
  assert.equal((await request('/api/tv/events', {headers})).json().deviceName, 'iPhone');
  assert.equal((await request('/api/mobile/name', post({deviceName:'iPhone 15'}, pair.tvToken))).status, 401);
  assert.equal((await request('/api/mobile/name', post({deviceName:'Bad\nName'}, mobile))).status, 400);
  assert.equal((await request('/api/mobile/name', post({deviceName:'iPhone 15'}, mobile))).status, 200);
  assert.equal((await request('/api/tv/events', {headers})).json().deviceName, 'iPhone 15');
}));

test('Ein nicht mehr erreichbares Handy beendet die angezeigte Verbindung', () => { let time=1000; return withRelay(async request => {
 const pair=(await request('/api/pair',post({}))).json();
 await request('/api/claim',post({pairToken:pair.pairToken,deviceName:'iPhone'}));
 time+=61000;
 assert.equal((await request('/api/tv/events',{headers:{authorization:'Bearer '+pair.tvToken}})).status,401);
}, {now:()=>time}); });

test('Anmelde-QR koppelt erst nach Jellyfin-Freigabe und TV-Abschluss', async () => {
  const http = require('node:http');
  let confirmed = 0, scanned = '';
  const jellyfin = http.createServer((req,res) => {
    if (req.url === '/Users/AuthenticateByName') { let raw=''; req.on('data', c=>raw+=c); req.on('end',()=>{const body=JSON.parse(raw); if (body.Username !== 'Test' || body.Pw !== 'valid') { res.writeHead(401); return res.end(); } res.setHeader('content-type','application/json'); res.end(JSON.stringify({AccessToken:'phone-test-token',User:{Id:'user1'}}));}); return; }
    if (req.url === '/QuickConnect/Authorize?code=123456' && /phone-test-token/.test(req.headers.authorization || '')) { confirmed++; res.end('true'); return; }
    res.writeHead(404); res.end();
  });
  await new Promise(r=>jellyfin.listen(0,'127.0.0.1',r));
  try { await withRelay(async (request) => {
    const pair=(await request('/api/tv/quick-connect-qr',post({server:'http://127.0.0.1:'+jellyfin.address().port,code:'123456'}))).json();
    assert.match(pair.tvToken,/^[A-Za-z0-9_-]{43}$/); const ticket=new URL(scanned).hash.slice(1);
    assert.notEqual(ticket,pair.tvToken); assert.ok(!scanned.includes('123456'));
    const claimed=(await request('/api/claim',post({pairToken:ticket,deviceName:'iPhone'}))).json();
    assert.equal(claimed.loginRequired,true); const mobile=claimed.mobileToken;
    assert.equal((await request('/api/mobile/events',{headers:{authorization:'Bearer '+mobile}})).status,403);
    assert.equal((await request('/api/tv/login-complete',post({},pair.tvToken))).status,400);
    assert.equal((await request('/api/tv/login-complete',post({},mobile))).status,401);
    assert.equal((await request('/api/mobile/login',post({username:'Test',password:'wrong'},mobile))).status,401);
    assert.equal((await request('/api/mobile/login',post({username:'Test',password:'valid'},mobile))).status,200);
    assert.equal(confirmed,1); assert.equal((await request('/api/mobile/login-status',{headers:{authorization:'Bearer '+mobile}})).json().ready,false);
    assert.equal((await request('/api/tv/login-complete',post({},pair.tvToken))).status,200);
    assert.equal((await request('/api/mobile/login-status',{headers:{authorization:'Bearer '+mobile}})).json().ready,true);
    const queued = {type:'browse',id:'r1',kind:'movies',query:''};
    assert.equal((await request('/api/mobile/events',post(queued,mobile))).status,200);
    assert.equal((await request('/api/tv/login-complete',post({},pair.tvToken))).status,200, 'Wiederholung nach verlorener Antwort ist sicher');
    assert.equal((await request('/api/tv/login-complete',post({},mobile))).status,401, 'Handy-Token berechtigt nicht zum TV-Abschluss');
    assert.deepEqual((await request('/api/tv/events',{headers:{authorization:'Bearer '+pair.tvToken}})).json().events,[queued], 'Wiederholung verwirft keine wartenden Nachrichten');
    assert.equal((await request('/api/mobile/events',{headers:{authorization:'Bearer '+mobile}})).status,200);
    assert.equal((await request('/api/claim',post({pairToken:ticket}))).status,401);
  }, {renderQr:(url,cb)=>{scanned=url;cb(null,'<svg></svg>');}}); } finally { await new Promise(r=>jellyfin.close(r)); }
});

test('Anmelde-Ticket bleibt bis zwei Minuten gültig und läuft danach ab', () => { let time=1000, link=''; return withRelay(async request => {
 const pair=(await request('/api/tv/quick-connect-qr',post({server:'http://127.0.0.1:8096',code:'123456'}))).json();
 const mobile=(await request('/api/claim',post({pairToken:new URL(link).hash.slice(1)}))).json().mobileToken;
 time+=61000; assert.equal((await request('/api/mobile/login-status',{headers:{authorization:'Bearer '+mobile}})).status,200);
 time+=60000; assert.equal((await request('/api/mobile/login-status',{headers:{authorization:'Bearer '+mobile}})).status,401);
 assert.equal((await request('/api/tv/login-complete',post({},pair.tvToken))).status,401);
}, {now:()=>time,renderQr:(url,cb)=>{link=url;cb(null,'<svg></svg>');}}); });

test('Beim Abbruch während der Anmeldung wird die temporäre Jellyfin-Sitzung beendet', async () => {
  const http = require('node:http');
  let scanned = '', finishLogin, notifyLogin, notifyLogout, authorizations = 0;
  const loginStarted = new Promise(resolve => { notifyLogin = resolve; });
  const logoutReceived = new Promise(resolve => { notifyLogout = resolve; });
  const jellyfin = http.createServer((req, res) => {
    if (req.url === '/Users/AuthenticateByName') { req.resume(); req.on('end', () => { finishLogin = () => res.end(JSON.stringify({AccessToken:'temporary-token'})); notifyLogin(); }); return; }
    if (req.url === '/Sessions/Logout') { assert.match(req.headers.authorization, /temporary-token/); req.resume(); res.end(''); notifyLogout(); return; }
    if (req.url.startsWith('/QuickConnect/Authorize')) authorizations += 1;
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => jellyfin.listen(0, '127.0.0.1', resolve));
  try { await withRelay(async request => {
    const pair = (await request('/api/tv/quick-connect-qr', post({server:'http://127.0.0.1:' + jellyfin.address().port,code:'123456'}))).json();
    const mobile = (await request('/api/claim', post({pairToken:new URL(scanned).hash.slice(1)}))).json().mobileToken;
    const login = request('/api/mobile/login', post({username:'Test',password:'example'}, mobile));
    await loginStarted;
    assert.equal((await request('/api/tv/close', post({}, pair.tvToken))).status, 200);
    finishLogin();
    assert.equal((await login).status, 401);
    await logoutReceived;
    assert.equal(authorizations, 0);
  }, {renderQr:(url,cb)=>{scanned=url;cb(null,'<svg></svg>');}}); }
  finally { await new Promise(resolve => jellyfin.close(resolve)); }
});

test('Ein Anmelde-Ticket begrenzt wiederholte Passwortversuche', async () => {
  const http = require('node:http');
  let scanned = '', attempts = 0;
  const jellyfin = http.createServer((req, res) => { attempts += 1; req.resume(); res.writeHead(401); res.end(); });
  await new Promise(resolve => jellyfin.listen(0, '127.0.0.1', resolve));
  try { await withRelay(async request => {
    await request('/api/tv/quick-connect-qr', post({server:'http://127.0.0.1:' + jellyfin.address().port,code:'123456'}));
    const mobile = (await request('/api/claim', post({pairToken:new URL(scanned).hash.slice(1)}))).json().mobileToken;
    for (let i = 0; i < 8; i += 1) assert.equal((await request('/api/mobile/login', post({username:'Test',password:'wrong'}, mobile))).status, 401);
    assert.equal((await request('/api/mobile/login', post({username:'Test',password:'wrong'}, mobile))).status, 429);
    assert.equal(attempts, 8);
  }, {renderQr:(url,cb)=>{scanned=url;cb(null,'<svg></svg>');}}); }
  finally { await new Promise(resolve => jellyfin.close(resolve)); }
});

test('Aktive Verbindung übersteht eine Stunde, endet aber nach maximaler Lebensdauer', async () => {
  let time = 1000;
  await withRelay(async request => {
    const pair = (await request('/api/pair', post({}))).json();
    const mobile = (await request('/api/claim', post({pairToken:pair.pairToken}))).json().mobileToken;
    const tvHeaders = {authorization:'Bearer ' + pair.tvToken};
    const mobileHeaders = {authorization:'Bearer ' + mobile};
    assert.equal((await request('/api/tv/login-complete', post({},pair.tvToken))).status, 400, 'Normale Pairing-Sitzungen erhalten keinen Login-Abschluss');
    for (let i = 0; i < 63; i += 1) {
      time += 59000;
      assert.equal((await request('/api/tv/events',{headers:tvHeaders})).status,200);
      assert.equal((await request('/api/mobile/events',{headers:mobileHeaders})).status,200);
    }
    assert.ok(time > 3601000);
  }, {now:() => time});
  time = 1000;
  await withRelay(async request => {
    const pair = (await request('/api/pair', post({}))).json();
    const mobile = (await request('/api/claim', post({pairToken:pair.pairToken}))).json().mobileToken;
    const tvHeaders = {authorization:'Bearer ' + pair.tvToken};
    const mobileHeaders = {authorization:'Bearer ' + mobile};
    for (let i = 0; i < 3; i += 1) {
      time += 59000;
      assert.equal((await request('/api/tv/events',{headers:tvHeaders})).status,200);
      assert.equal((await request('/api/mobile/events',{headers:mobileHeaders})).status,200);
    }
    time = 201000;
    assert.equal((await request('/api/tv/events',{headers:tvHeaders})).status,401, 'Maximale Laufzeit gilt auch für aktive Sitzungen');
  }, {now:() => time, sessionTtl:200000});
});
