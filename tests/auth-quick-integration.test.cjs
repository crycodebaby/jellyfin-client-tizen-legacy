'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createPreviewServer}=require('../scripts/preview.cjs');
test('Quick Connect und automatische Wiederherstellung unterscheiden Ausfall, Abmeldung und Widerruf',async()=>{
 const server=createPreviewServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080}});let state='ok';
 try {
  await page.route('**/QuickConnect/Initiate',r=>r.fulfill({json:{Code:'123456',Secret:'secret',Authenticated:false}}));
  await page.route('**/QuickConnect/Connect?*',r=>r.fulfill({json:{Secret:'secret',Authenticated:true}}));
  await page.route('**/Users/AuthenticateWithQuickConnect',r=>r.fulfill({json:{AccessToken:'token',User:{Id:'user',Name:'Test'}}}));
  await page.route('**/Users/user',r=>state==='offline'?r.fulfill({status:503}):state==='invalid'?r.fulfill({status:401}):r.fulfill({json:{Id:'user',Name:'Test'}}));
  await page.route('**/Items?*',r=>r.fulfill({json:{Items:[],StartIndex:0,TotalRecordCount:0}}));
  await page.route('**/Sessions/Logout',r=>r.fulfill({status:204,body:''}));
  await page.goto(base + '/?preview=1'); await page.locator('#profile-button').click(); await page.locator('#settings-open').click(); await page.locator('#server-url').fill(base); await page.locator('#settings-back').click();
  await page.locator('#quick-open').click(); await page.getByText('123456',{exact:true}).waitFor();
  await page.locator('#connection-modal').waitFor({state:'hidden'}); assert.equal(await page.locator('#auth-logout').isVisible(),false);
  assert.ok(await page.evaluate(()=>localStorage.getItem('smairys.session'))); assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('smairys.connection'))).password,'');
  await page.reload(); await page.waitForFunction(()=>document.getElementById('auth-logout').style.display!=='none');
  state='offline'; await page.reload(); await page.waitForFunction(()=>document.getElementById('connection-status').textContent.indexOf('nicht erreichbar')!==-1); assert.ok(await page.evaluate(()=>localStorage.getItem('smairys.session')));
  state='ok'; await page.locator('#profile-button').click(); await page.waitForFunction(()=>document.getElementById('auth-logout').style.display!=='none'); await page.locator('#auth-logout').click(); assert.equal(await page.evaluate(()=>localStorage.getItem('smairys.session')),null);
  await page.locator('#profile-button').click(); await page.locator('#quick-open').click(); await page.locator('#connection-modal').waitFor({state:'hidden'}); state='invalid'; await page.reload(); await page.waitForFunction(()=>document.getElementById('connection-status').textContent.indexOf('erneut anmelden')!==-1); assert.equal(await page.evaluate(()=>localStorage.getItem('smairys.session')),null);
 }finally{await browser.close();await new Promise(r=>server.close(r))}
});
