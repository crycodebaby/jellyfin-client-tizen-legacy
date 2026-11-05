'use strict';

// Optional LAN relay. It holds only short-lived pairing capabilities and bounded messages.
const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Build only a local Jellyfin Web authorization link, never arbitrary QR content.
function quickConnectLink(host, server, code) {
  if (typeof server !== 'string' || !server || server.length > 512 || /[\x00-\x20\x7f\\@%?#]/.test(server) || typeof code !== 'string' || !/^[A-Za-z0-9]{6}$/.test(code)) return null;
  try {
    const url = new URL(server);
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== host || url.username || url.password || url.search || url.hash || !/^\/(?:[A-Za-z0-9_-]+\/?)*$/.test(url.pathname)) return null;
    const basePath = url.pathname.replace(/\/+$/, '');
    return url.protocol + '//' + host + (url.port ? ':' + url.port : '') + basePath + '/web/#/quickconnect?code=' + code;
  } catch (_) { return null; }
}

function createRelay(options) {
  options = options || {};
  const host = options.host || '127.0.0.1';
  const port = options.port === undefined ? 8787 : options.port;
  const ttl = options.ttl || 120000;
  // Paired clients must both heartbeat within 60 seconds; even an active session
  // has a bounded maximum lifetime and requires a fresh QR after one day.
  const sessionTtl = options.sessionTtl || 24 * 60 * 60 * 1000;
  const now = options.now || Date.now;
  const sessions = new Map();
  const attempts = new Map();
  const clipApi = options.clips ? require('./clip-api.cjs').createClipApi(options.clips) : null;
  let activeQuickQr = 0;
  function token() { return crypto.randomBytes(32).toString('base64url'); }
  function renderQr(link, callback) {
    if (typeof options.renderQr === 'function') return options.renderQr(link, callback);
    const child = spawn(options.python || process.env.SMAIRYS_QR_PYTHON || 'python', [path.join(__dirname, 'qr.py')], { stdio:['pipe','pipe','ignore'], windowsHide:true });
    let output = '', done = false;
    const timeout = setTimeout(() => { child.kill(); finish(new Error('qr timeout')); }, 10000);
    function finish(error) { if (done) return; done = true; clearTimeout(timeout); callback(error, output); }
    child.on('error', () => finish(new Error('qr unavailable')));
    child.stdout.on('data', chunk => { if (output.length + chunk.length > 262144) { child.kill(); finish(new Error('qr too large')); } else output += chunk; });
    child.on('close', code => { if (code !== 0 || !/^<svg[\s>]/.test(output) || !output.endsWith('</svg>')) finish(new Error('qr unavailable')); else finish(null); });
    child.stdin.end(link + '\n');
  }
  function clean() {
    const t = now();
    for (const [key, s] of sessions) if (s.expires <= t || (s.loginPending && s.pairExpires <= t) || (!s.mobile && s.pairExpires <= t) || (s.mobile && !s.loginPending && (s.lastTvAt + 60000 <= t || s.lastMobileAt + 60000 <= t))) sessions.delete(key);
    for (const [key, a] of attempts) if (a.until <= t) attempts.delete(key);
  }
  function rate(req) {
    const key = req.socket.remoteAddress || '';
    let a = attempts.get(key);
    if (!a || a.until <= now()) a = {count: 0, until: now() + 60000};
    a.count++; attempts.set(key, a);
    return a.count <= 180 && attempts.size <= 1000;
  }
  function rateQuickQr(req) {
    const attempt = attempts.get(req.socket.remoteAddress || '');
    if (!attempt) return false;
    attempt.quickQr = (attempt.quickQr || 0) + 1;
    return attempt.quickQr <= 10;
  }
  function send(res, status, body) {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer'});
    res.end(JSON.stringify(body));
  }
  function bearer(req) { const m = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || ''); return m && m[1]; }
  function find(which, value) {
    if (!value) return null;
    for (const s of sessions.values()) if (s[which] === value) return s;
    return null;
  }
  function text(v, max) { return typeof v === 'string' && v.length <= max && !/[\x00-\x1f]/.test(v); }
  function id(v) { return text(v, 80) && /^[A-Za-z0-9_-]+$/.test(v); }
  function exact(obj, names) { return obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).every(k => names.includes(k)); }
  function jellyfinPost(base, suffix, authorization, body, callback) {
    const target = new URL(base.replace(/\/+$/, '') + suffix);
    const data = body === null ? '' : JSON.stringify(body);
    let done = false, output = '';
    function finish(err, value) { if (done) return; done = true; callback(err, value); }
    const request = (target.protocol === 'https:' ? https : http).request(target, {method:'POST', headers:{Authorization:authorization, 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(data)}}, response => {
      response.on('data', chunk => { output += chunk; if (output.length > 65536) { request.destroy(); finish(new Error('response too large')); } });
      response.on('end', () => { if (response.statusCode < 200 || response.statusCode >= 300) return finish(new Error('login failed')); try { finish(null, JSON.parse(output)); } catch (_) { finish(new Error('invalid response')); } });
      response.on('error', () => finish(new Error('unavailable')));
    });
    request.setTimeout(8000, () => request.destroy());
    request.on('error', () => finish(new Error('unavailable')));
    request.end(data);
  }
  function validMobile(m) {
    if (!m || !id(m.id)) return false;
    if (m.type === 'browse') return exact(m, ['type','id','kind','query','start','limit']) && ['movies','people'].includes(m.kind) && text(m.query, 100) && (m.start === undefined || Number.isInteger(m.start) && m.start >= 0 && m.start <= 10000) && (m.limit === undefined || Number.isInteger(m.limit) && m.limit >= 1 && m.limit <= 50);
    if (m.type === 'person') return exact(m, ['type','id','personId','start','limit']) && id(m.personId) && (m.start === undefined || Number.isInteger(m.start) && m.start >= 0 && m.start <= 10000) && (m.limit === undefined || Number.isInteger(m.limit) && m.limit >= 1 && m.limit <= 50);
    return m.type === 'play' && exact(m, ['type','id','itemId']) && id(m.itemId);
  }
  function validImage(value, itemId) {
    if (value === undefined || value === '') return true;
    if (!text(value, 1500)) return false;
    try {
      const u = new URL(value);
      if (!['http:', 'https:'].includes(u.protocol) || u.hostname !== host || u.username || u.password || u.hash) return false;
      if (!u.pathname.toLowerCase().endsWith(('/items/' + encodeURIComponent(itemId) + '/images/primary').toLowerCase())) return false;
      for (const key of u.searchParams.keys()) if (!['tag','maxwidth'].includes(key.toLowerCase())) return false;
      return true;
    } catch (_) { return false; }
  }
  function validTv(m) {
    if (!m || !id(m.id)) return false;
    if (m.type === 'play-result') return exact(m,['type','id','ok']) && typeof m.ok === 'boolean';
    if (m.type !== 'browse-result' && m.type !== 'person-result') return false;
    return exact(m,['type','id','items','total','error']) && Array.isArray(m.items) && m.items.length <= 50 && m.items.every(i => exact(i,['id','title','kind','imageUrl']) && id(i.id) && text(i.title, 200) && ['movie','person'].includes(i.kind) && validImage(i.imageUrl, i.id)) && (m.total === undefined || Number.isInteger(m.total) && m.total >= 0 && m.total <= 1000000) && (m.error === undefined || typeof m.error === 'boolean');
  }
  const server = http.createServer((req, res) => {
    clean();
    const expectedHost = host + ':' + server.address().port;
    if (req.headers.host !== expectedHost || !rate(req)) return send(res, 403, {error:'forbidden'});
    const origin = req.headers.origin;
    const mobileOrigin = 'http://' + expectedHost;
    const tvPath = req.url === '/api/pair' || req.url.startsWith('/api/tv/');
    if (origin && origin !== mobileOrigin && !(tvPath && origin === 'null')) return send(res, 403, {error:'forbidden'});
    if (origin === 'null' && tvPath) { res.setHeader('Access-Control-Allow-Origin','null'); res.setHeader('Vary','Origin'); }
    if (req.method === 'OPTIONS' && tvPath && origin === 'null') { res.writeHead(204, {'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'60'}); return res.end(); }
    if (clipApi && req.url.startsWith('/api/tv/clips/')) {
      if (origin && origin !== 'null') return send(res,403,{error:'forbidden'});
      const peer=req.socket.remoteAddress || '';
      const content=/^\/api\/tv\/clips\/content\/([A-Za-z0-9_-]{43})$/.exec(req.url);
      if ((req.method === 'GET' || req.method === 'HEAD') && content) {
        return clipApi.open(content[1],peer,req.headers.range).then(file=>{
          const headers={'Content-Type':'video/x-matroska','Content-Length':file.length,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
          if(file.partial) headers['Content-Range']='bytes '+file.start+'-'+file.end+'/'+file.total;
          res.writeHead(file.partial?206:200,headers);file.stream.on('error',()=>res.destroy());if(req.method==='HEAD'){file.stream.destroy();return res.end();}file.stream.pipe(res);
        }).catch(error=>send(res,error && error.message==='invalid range'?416:404,{error:'unavailable'}));
      }
      if(req.method !== 'POST' || !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return send(res,404,{error:'not found'});
      const authMatch=/^Bearer ([A-Za-z0-9._~-]{1,4096})$/.exec(req.headers.authorization||'');
      if(!authMatch)return send(res,401,{error:'unauthorized'});
      let raw='',tooLarge=false;req.on('data',part=>{if(raw.length+part.length>4096)tooLarge=true;else raw+=part;});
      return req.on('end',()=>{
        if(tooLarge)return send(res,413,{error:'too large'});
        let body;try{body=JSON.parse(raw)}catch(_){return send(res,400,{error:'invalid'})}
        const auth={token:authMatch[1]};let operation;
        if(req.url==='/api/tv/clips/create')operation=clipApi.submit(auth,body);
        else if(req.url==='/api/tv/clips/status' && exact(body,['itemId','id']))operation=clipApi.status(auth,body.itemId,body.id);
        else if(req.url==='/api/tv/clips/list' && exact(body,['itemId']))operation=clipApi.list(auth,body.itemId);
        else if(req.url==='/api/tv/clips/ticket' && exact(body,['itemId','id']))operation=clipApi.ticket(auth,body.itemId,body.id,peer);
        else return send(res,404,{error:'not found'});
        Promise.resolve(operation).then(value=>send(res,200,value)).catch(()=>send(res,400,{error:'unavailable'}));
      });
    }
    if (req.method === 'GET' && (req.url === '/' || req.url === '/app.js' || req.url === '/styles.css')) {
      const file = req.url === '/' ? 'index.html' : req.url.slice(1);
      const types = {'index.html':'text/html; charset=utf-8','app.js':'text/javascript; charset=utf-8','styles.css':'text/css; charset=utf-8'};
      return fs.readFile(path.join(__dirname,'web',file), (err, data) => { if (err) return send(res,404,{error:'not found'}); res.writeHead(200, {'Content-Type':types[file], 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'self'; img-src 'self' http://" + host + ":* https://" + host + ":*; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}); res.end(data); });
    }
    if (req.method === 'GET' && req.url === '/api/tv/qr') {
      const s = find('tv', bearer(req));
      if (!s || !s.pair || s.pairExpires <= now()) return send(res, 401, {error:'unauthorized'});
      const pairValue = s.pair;
      const link = 'http://' + expectedHost + '/#' + pairValue;
      return renderQr(link, (error, svg) => {
        if (error) return send(res, 503, {error:'qr unavailable'});
        if (!sessions.has(s.tv) || s.pair !== pairValue || s.pairExpires <= now()) return send(res, 401, {error:'expired'});
        return send(res, 200, {svg});
      });
    }
    if (req.method === 'GET' && (req.url === '/api/tv/events' || req.url === '/api/mobile/events')) {
      const tv = req.url === '/api/tv/events'; const s = find(tv ? 'tv' : 'mobile', bearer(req));
      if (!s) return send(res,401,{error:'unauthorized'});
      if (s.loginPending) return send(res,403,{error:'login pending'});
      if (tv) s.lastTvAt = now(); else s.lastMobileAt = now();
      const q = tv ? s.toTv : s.toMobile; return send(res,200,{events:q.splice(0), paired:!!s.mobile, deviceName:tv && s.mobile ? s.deviceName : undefined});
    }
    if (req.method === 'GET' && req.url === '/api/mobile/login-status') {
      const s = find('mobile', bearer(req));
      if (!s) return send(res,401,{error:'unauthorized'});
      s.lastMobileAt = now(); return send(res,200,{ready:!s.loginPending});
    }
    if (req.method !== 'POST' || !['/api/pair','/api/claim','/api/tv/events','/api/mobile/events','/api/tv/close','/api/mobile/name','/api/tv/quick-connect-qr','/api/mobile/login','/api/tv/login-complete'].includes(req.url) || !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return send(res,404,{error:'not found'});
    let raw = ''; let oversized = false;
    req.on('data', chunk => { if (oversized) return; if (raw.length + chunk.length > 16384) { oversized = true; raw = ''; return; } raw += chunk; });
    req.on('end', () => {
      if (oversized) return send(res,413,{error:'too large'});
      let body; try { body = JSON.parse(raw); } catch (_) { return send(res,400,{error:'invalid'}); } finally { raw = ''; }
      if (req.url === '/api/tv/quick-connect-qr') {
        if (origin && origin !== 'null') return send(res,403,{error:'forbidden'});
        if (!exact(body,['server','code']) || !quickConnectLink(host, body.server, body.code)) return send(res,400,{error:'invalid'});
        if (!rateQuickQr(req) || activeQuickQr >= 2) return send(res,429,{error:'busy'});
        if (sessions.size >= 20) return send(res,429,{error:'busy'});
        const s = {tv:token(), pair:token(), mobile:null, pairExpires:now()+ttl, expires:now()+sessionTtl, lastTvAt:now(), toTv:[], toMobile:[], loginPending:true, authorized:false, jellyfinBase:body.server, code:body.code};
        sessions.set(s.tv,s);
        const link = 'http://' + expectedHost + '/#' + s.pair;
        activeQuickQr++;
        return renderQr(link, (error, svg) => { activeQuickQr--; if (error || !sessions.has(s.tv)) { sessions.delete(s.tv); return send(res,503,{error:'qr unavailable'}); } return send(res,200,{svg,tvToken:s.tv}); });
      }
      if (req.url === '/api/pair') {
        if (!exact(body,[]) || sessions.size >= 20) return send(res,400,{error:'invalid'});
        const s = {tv:token(), pair:token(), mobile:null, pairExpires:now()+ttl, expires:now()+sessionTtl, lastTvAt:now(), toTv:[], toMobile:[]}; sessions.set(s.tv,s);
        return send(res,200,{tvToken:s.tv,pairToken:s.pair,expiresIn:Math.floor(ttl/1000)});
      }
      if (req.url === '/api/claim') {
        if (!exact(body,['pairToken','deviceName']) || typeof body.pairToken !== 'string' || (body.deviceName !== undefined && (!text(body.deviceName,40) || !body.deviceName.trim()))) return send(res,400,{error:'invalid'});
        const s = find('pair', body.pairToken);
        if (!s || s.mobile || s.pairExpires <= now()) return send(res,401,{error:'unauthorized'});
        s.pair = null; s.mobile = token(); s.lastMobileAt = now(); s.deviceName = body.deviceName ? body.deviceName.trim() : 'Handy'; return send(res,200,{mobileToken:s.mobile, loginRequired:!!s.loginPending});
      }
      const tv = req.url.startsWith('/api/tv/'); const s = find(tv ? 'tv':'mobile',bearer(req));
      if (!s) return send(res,401,{error:'unauthorized'});
      if (req.url === '/api/mobile/login') {
        if (!s.loginPending || s.authorized || s.authInFlight || !exact(body,['username','password']) || !text(body.username,256) || !body.username.trim() || !text(body.password,1024)) return send(res,400,{error:'invalid'});
        if ((s.loginAttempts || 0) >= 8) return send(res,429,{error:'too many attempts'});
        s.loginAttempts = (s.loginAttempts || 0) + 1;
        s.authInFlight = true;
        const header = 'MediaBrowser Client="Smairys%20Connect", Device="Handy", DeviceId="' + crypto.randomBytes(16).toString('hex') + '", Version="0.1.0"';
        const jellyfinBase = s.jellyfinBase;
        jellyfinPost(jellyfinBase, '/Users/AuthenticateByName', header, {Username:body.username,Pw:body.password}, (error, data) => {
          if (error || !data || typeof data.AccessToken !== 'string' || !data.AccessToken || data.AccessToken.length > 1024 || /["\\\x00-\x1f\x7f]/.test(data.AccessToken)) { s.authInFlight = false; return send(res,401,{error:'authentication failed'}); }
          const authorizedHeader = header + ', Token="' + encodeURIComponent(data.AccessToken) + '"';
          data.AccessToken = '';
          if (!sessions.has(s.tv) || s.pairExpires <= now()) {
            s.authInFlight = false;
            jellyfinPost(jellyfinBase, '/Sessions/Logout', authorizedHeader, null, () => {});
            return send(res,401,{error:'authentication failed'});
          }
          jellyfinPost(jellyfinBase, '/QuickConnect/Authorize?code=' + encodeURIComponent(s.code), authorizedHeader, null, (err, ok) => {
            s.authInFlight = false;
            // The temporary phone-side Jellyfin session is no longer needed after authorization.
            jellyfinPost(jellyfinBase, '/Sessions/Logout', authorizedHeader, null, () => {});
            if (err || ok !== true || !sessions.has(s.tv) || s.pairExpires <= now()) return send(res,401,{error:'authorization failed'});
            s.authorized = true; return send(res,200,{ok:true});
          });
        });
        body.password = '';
        return;
      }
      if (req.url === '/api/tv/login-complete') {
        if (exact(body,[]) && s.loginCompleted === true) return send(res,200,{ok:true});
        if (!exact(body,[]) || !s.loginPending || !s.authorized || !s.mobile || s.pairExpires <= now()) return send(res,400,{error:'invalid'});
        s.loginPending = false; s.loginCompleted = true; s.code = ''; s.jellyfinBase = ''; s.lastTvAt = now(); s.lastMobileAt = now();
        return send(res,200,{ok:true});
      }
      if (s.loginPending && req.url !== '/api/tv/close') return send(res,403,{error:'login pending'});
      if (req.url === '/api/mobile/name') { if (!exact(body,['deviceName']) || !text(body.deviceName,40) || !body.deviceName.trim()) return send(res,400,{error:'invalid'}); s.deviceName = body.deviceName.trim(); return send(res,200,{ok:true}); }
      if (req.url === '/api/tv/close') { if (!exact(body,[])) return send(res,400,{error:'invalid'}); sessions.delete(s.tv); return send(res,200,{ok:true}); }
      if (!s.mobile || !(tv ? validTv(body) : validMobile(body))) return send(res,400,{error:'invalid'});
      const q = tv ? s.toMobile : s.toTv;
      if (q.length >= 50) return send(res,429,{error:'queue full'});
      q.push(body); return send(res,200,{ok:true});
    });
  });
  server.on('close', () => { sessions.clear(); attempts.clear(); });
  return server;
}
if (require.main === module) {
  const host = process.argv[2]; const port = Number(process.argv[3] || 8787);
  const octets = (host || '').split('.').map(Number);
  const privateAddress = octets.length === 4 && octets.every(n => Number.isInteger(n) && n >= 0 && n <= 255) && (octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168));
  if (!privateAddress || !Number.isInteger(port) || port < 1 || port > 65535) { process.stderr.write('Usage: node companion/relay.cjs <private local IPv4 address> [port]\n'); process.exit(1); }
  let clips;
  const configPath=process.env.SMAIRYS_CLIP_CONFIG;
  if(configPath){
    try {const config=JSON.parse(fs.readFileSync(configPath,'utf8'));clips={root:config.root,server:config.server,mediaRoots:config.mediaRoots,ffmpeg:config.ffmpeg,ffprobe:config.ffprobe};}
    catch(_){process.stderr.write('Clip-Konfiguration nicht verfügbar.\n');process.exit(1);}
  }
  createRelay({host,port,clips}).listen(port,host);
}
module.exports = {createRelay, quickConnectLink};
