'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createPreviewServer}=require('../scripts/preview.cjs');

test('Zwei Profile wechseln ohne Logout und erhalten getrennte Sitzungstoken', async () => {
  const server=createPreviewServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const logout=[];
  let targetStatus = 200;
  try {
    await page.route('**/Users/AuthenticateByName',route=>{
      const name=route.request().postDataJSON().Username;
      return route.fulfill({json:{AccessToken:'token-'+name,User:{Id:name,Name:name}}});
    });
    await page.route('**/Users/A',route=>route.fulfill({status:targetStatus,json:{Id:'A',Name:'A'}}));
    await page.route('**/Items?*',route=>route.fulfill({json:{Items:[],StartIndex:0,TotalRecordCount:0}}));
    await page.route('**/Sessions/Logout',route=>{logout.push(route.request().headers().authorization);return route.fulfill({status:204,body:''});});
    await page.goto(base+'/?preview=1');
    await page.locator('#profile-button').click();
    await page.locator('#settings-open').click();
    await page.locator('#server-url').fill(base);
    await page.locator('#settings-back').click();
    await page.locator('#auth-open').click();
    await page.locator('#auth-user').fill('A');
    await page.locator('#auth-password').fill('secret');
    await page.locator('#auth-submit').click();
    await page.locator('#profile-button').click();
    await page.locator('#auth-open').click();
    await page.locator('#auth-user').fill('B');
    await page.locator('#auth-password').fill('secret');
    await page.locator('#auth-submit').click();
    await page.locator('#profile-button').click();
    assert.equal(await page.locator('.profile-row').count(),2);
    assert.equal(await page.locator('.profile-row[aria-current]').textContent(),'BB✓ Aktiv');
    for (const status of [503, 401]) {
      targetStatus = status;
      await page.locator('[data-profile-id="A"]').click();
      await page.waitForFunction(() => document.getElementById('connection-status').className.includes('is-error'));
      assert.equal(await page.locator('.profile-row[aria-current]').getAttribute('data-profile-id'), 'B');
      const active = await page.evaluate(() => JSON.parse(localStorage.getItem('smairys.session')));
      assert.equal(active.session.userId, 'B');
      assert.equal(logout.length, 0);
    }
    targetStatus = 200;
    await page.locator('[data-profile-id="A"]').click();
    await page.waitForFunction(()=>document.getElementById('profile-button-name').textContent==='A');
    assert.equal(logout.length,0);
    await page.locator('#profile-button').click();
    await page.screenshot({path:'.build/profile-switch-preview.png'});
    assert.equal(await page.locator('.profile-row[aria-current]').getAttribute('data-profile-id'),'A');
    await page.locator('#auth-logout').click();
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('smairys.profiles')));
    assert.deepEqual(stored.map(p=>p.session.userId),['B']);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
});
