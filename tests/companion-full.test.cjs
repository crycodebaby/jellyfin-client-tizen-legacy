'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');
const { createRelay } = require('../companion/relay.cjs');

test('TV-Profil und Handy tauschen Filme und einen Wiedergabewunsch aus', async (t) => {
 const preview=createPreviewServer(), relay=createRelay({host:'127.0.0.1',port:8787});
 try { await new Promise((resolve,reject)=>relay.once('error',reject).listen(8787,'127.0.0.1',resolve)); }
 catch(e) { if(e.code==='EADDRINUSE') return t.skip('Port 8787 ist belegt'); throw e; }
 await new Promise(resolve=>preview.listen(0,'127.0.0.1',resolve));
 const tvUrl=`http://127.0.0.1:${preview.address().port}`;
 const browser=await chromium.launch({headless:true}); const tv=await browser.newPage({viewport:{width:1920,height:1080}}); const phone=await browser.newPage({viewport:{width:390,height:844}}); let pairToken='';
 try {
  await tv.addInitScript(()=>{window.webapis={avplay:{state:'NONE',open(){this.state='IDLE'},close(){this.state='NONE'},stop(){this.state='IDLE'},setListener(){},setDisplayRect(){},prepareAsync(ok){this.state='READY';setTimeout(ok,0)},play(){this.state='PLAYING'},pause(){this.state='PAUSED'},seekTo(ms,ok){setTimeout(ok,0)},getState(){return this.state},getCurrentTime(){return 1000},getDuration(){return 120000},getTotalTrackInfo(){return []},getCurrentStreamInfo(){return []}}};});
  await tv.route('http://127.0.0.1:8787/**', async route=>{
    const request=route.request(), url=request.url();
    if(url.endsWith('/api/tv/qr')) return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({svg:'<svg xmlns="http://www.w3.org/2000/svg"></svg>'}),headers:{'access-control-allow-origin':'*'}});
    const headers={...request.headers(),origin:'null'}; delete headers.host; delete headers['content-length'];
    const response=await fetch(url,{method:request.method(),headers,body:request.postData() || undefined}); const body=await response.text();
    if(url.endsWith('/api/pair')&&response.ok) pairToken=JSON.parse(body).pairToken;
    await route.fulfill({status:response.status,contentType:'application/json',body,headers:{'access-control-allow-origin':'*'}});
  });
  await tv.route('**/Genres?*', route=>route.fulfill({json:{Items:[],StartIndex:0,TotalRecordCount:0}}));
  await tv.route('**/Users/AuthenticateByName',route=>route.fulfill({json:{AccessToken:'token',User:{Id:'user',Name:'Test'}}}));
  await tv.route('**/Users/user/Items/film1',route=>route.fulfill({json:{Id:'film1',Name:'Ein Film',UserData:{},People:[]}}));
  await tv.route('**/Items/film1/PlaybackInfo',route=>route.fulfill({json:{PlaySessionId:'session',MediaSources:[{Id:'source',SupportsDirectPlay:true}]}}));
  await tv.route('**/Sessions/Playing**',route=>route.fulfill({status:204,body:''}));
  await tv.route('**/Items?*',route=>{let p=new URL(route.request().url()).searchParams;return route.fulfill({json:{Items:[{Id:'film1',Name:'Ein Film'}],StartIndex:Number(p.get('startIndex'))||0,TotalRecordCount:1}})});
  await tv.goto(tvUrl + '/?preview=1'); await tv.locator('#profile-button').focus(); await tv.keyboard.press('Enter'); await tv.locator('#settings-open').click(); await tv.locator('#server-url').fill('http://127.0.0.1:8096'); await tv.locator('#settings-back').click(); await tv.locator('#auth-open').click(); await tv.locator('#auth-user').fill('Test'); await tv.locator('#auth-password').fill('test'); await tv.locator('#auth-submit').click();
  await tv.locator('#profile-button').click(); await tv.locator('#phone-open').click(); await tv.getByText('QR-Code scannen.').waitFor(); assert.equal(pairToken.length,43);
  await phone.goto('http://127.0.0.1:8787/#'+pairToken); await phone.locator('.device-options summary').click(); await phone.locator('#device-name').fill('Mein iPhone'); await phone.locator('#device-form button').click(); await phone.getByText('Name auf dem Fernseher aktualisiert.').waitFor(); await tv.getByText('Mein iPhone verbunden', {exact:true}).waitFor(); await phone.getByRole('button',{name:'FILM Ein Film Auf Fernseher abspielen'}).waitFor(); await phone.getByRole('button',{name:'FILM Ein Film Auf Fernseher abspielen'}).click();
  await tv.locator('#player-view').waitFor({state:'visible'}); await tv.waitForFunction(() => document.getElementById('player-status').textContent === 'Wiedergabe'); await phone.getByText('An den Fernseher gesendet.').waitFor();
 } finally { await browser.close(); await new Promise(resolve=>preview.close(resolve)); await new Promise(resolve=>relay.close(resolve)); }
});
