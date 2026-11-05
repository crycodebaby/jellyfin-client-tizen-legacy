'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');
test('Lokaler Trailer startet nur auf Wunsch und verändert keinen Filmfortschritt', async () => {
 const server=createPreviewServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1920,height:1080}}); const calls=[];
 try {
  await page.addInitScript(()=>{window.avplayTest={state:'NONE', open(url){this.url=url;this.state='IDLE'},close(){this.state='NONE'},stop(){this.state='IDLE'},setListener(){},setDisplayRect(){},prepareAsync(ok){this.state='READY';setTimeout(ok,0)},play(){this.state='PLAYING'},pause(){this.state='PAUSED'},seekTo(ms,ok){ok()},getState(){return this.state},getCurrentTime(){return 1000},getDuration(){return 30000},getTotalTrackInfo(){return []},getCurrentStreamInfo(){return []}};window.webapis={avplay:window.avplayTest};});
  await page.route('**/Genres?*', route=>route.fulfill({json:{Items:[],StartIndex:0,TotalRecordCount:0}}));
  await page.route('**/Users/AuthenticateByName',r=>r.fulfill({json:{AccessToken:'token',User:{Id:'user',Name:'Test'}}}));
  await page.route('**/Items?*',r=>{const u=new URL(r.request().url());return r.fulfill({json:{Items:[{Id:'film1',Name:'Film'}],StartIndex:Number(u.searchParams.get('startIndex'))||0,TotalRecordCount:1}})});
  await page.route('**/Users/user/Items/film1',r=>r.fulfill({json:{Id:'film1',Name:'Film',RunTimeTicks:1200000000,UserData:{PlaybackPositionTicks:500000000},People:[]}}));
  await page.route('**/Items/film1/LocalTrailers?*',r=>r.fulfill({json:[{Id:'trailer1',Type:'Trailer',Path:'ignored',Url:'https://untrusted.invalid/'}]}));
  await page.route('**/Items/*/PlaybackInfo',r=>{calls.push(new URL(r.request().url()).pathname);return r.fulfill({json:{PlaySessionId:'session',MediaSources:[{Id:'source',SupportsDirectPlay:true}]}})});
  await page.route('**/Sessions/Playing**',r=>{calls.push('report');return r.fulfill({status:204,body:''})});
  await page.goto('http://127.0.0.1:'+server.address().port+'/?preview=1'); await page.locator('#profile-button').click(); await page.locator('#settings-open').click();await page.locator('#server-url').fill('http://127.0.0.1:8096');await page.locator('#settings-back').click();await page.locator('#auth-open').click();await page.locator('#auth-user').fill('Test');await page.locator('#auth-password').fill('test');await page.locator('#auth-submit').click();
  await page.locator('[data-movie-id="film1"]').first().click();await page.locator('#trailer-button').waitFor({state:'visible'}); assert.equal(calls.length,0);
  await page.locator('#trailer-button').focus(); await page.keyboard.press('Enter');await page.getByText('Wiedergabe',{exact:true}).waitFor();
  assert.deepEqual(calls,['/Items/trailer1/PlaybackInfo']);assert.match(await page.evaluate(()=>window.avplayTest.url), /^http:\/\/127\.0\.0\.1:8096\/Videos\/trailer1\//);
  await page.keyboard.press('Escape');assert.equal(await page.locator(':focus').getAttribute('id'),'trailer-button');assert.equal(calls.includes('report'),false);
 } finally {await browser.close();await new Promise(r=>server.close(r));}
});
