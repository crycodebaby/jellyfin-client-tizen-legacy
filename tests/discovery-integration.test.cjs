'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');

test('Neue Filme und Gesehenfilter nutzen Jellyfin und sind per Fernbedienung erreichbar', async () => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const requests = [];
  try {
    await page.clock.install({ time: new Date(2026, 0, 1, 23, 30, 0) });
    await page.route('**/Users/AuthenticateByName', route => route.fulfill({ json: { AccessToken: 'token', User: { Id: 'user', Name: 'Test' } } }));
    await page.route('**/Genres?*', route => route.fulfill({ json: { Items: [{ Id: 'genre1', Name: 'Action' }, { Id: 'genre2', Name: 'Drama' }], StartIndex: 0, TotalRecordCount: 2 } }));
    await page.route('**/Persons?*', route => route.fulfill({ json: { Items: [{ Id: 'actor1', Name: 'Alex Star' }], StartIndex: 0, TotalRecordCount: 1 } }));
    await page.route('**/Users/user/Items/latest0', route => route.fulfill({ json: { Id: 'latest0', Name: 'Film 0', ProductionYear: 2020, RunTimeTicks: 72000000000, Genres: ['Action', 'Drama'], People: [] } }));
    await page.route('**/Users/user/Items/latest1', route => route.fulfill({ json: { Id: 'latest1', Name: 'Film 1', RunTimeTicks: 72000000000, UserData: { PlaybackPositionTicks: 18000000000 }, People: [] } }));
    await page.route('**/Items?*', route => {
      const q = new URL(route.request().url()).searchParams;
      requests.push({ sort: q.get('sortBy'), order: q.get('sortOrder'), years: q.get('years'), filter: q.get('filters'), played: q.get('isPlayed'), favorite: q.get('isFavorite'), start: q.get('startIndex'), genre: q.get('genreIds'), actor: q.get('personIds') });
      const latest = q.get('sortBy') === 'DateCreated';
      const favorite = q.get('isFavorite') === 'true';
      const discover = !favorite && ['SortName', 'ProductionYear,SortName'].includes(q.get('sortBy'));
      const items = latest ? Array.from({ length: 5 }, (_, i) => ({ Id: `latest${i}`, Name: `Film ${i}` })) : (favorite || discover ? [{ Id: 'm1', Name: 'Ein Film', UserData: { PlayedPercentage: 35 } }] : []);
      if (discover && !q.has('isPlayed')) {
        items.push(
          { Id: 'seen', Name: 'Gesehener Film', ProductionYear: 2011, UserData: { Played: true, PlayedPercentage: 100 } },
          { Id: 'rewatch', Name: 'Ein sehr langer Filmtitel für drei Zeilen', RunTimeTicks: 1000000000,
            UserData: { Played: true, PlayedPercentage: 100, PlaybackPositionTicks: 250000000 } }
        );
      }
      route.fulfill({ json: { Items: items, StartIndex: Number(q.get('startIndex')), TotalRecordCount: items.length } });
    });
    await page.goto(base + '/?preview=1');
    await page.locator('#profile-button').click(); await page.locator('#settings-open').click(); await page.locator('#server-url').fill(base); await page.locator('#settings-back').click();
    await page.locator('#auth-open').click(); await page.locator('#auth-user').fill('Test'); await page.locator('#auth-password').fill('password'); await page.locator('#auth-submit').click();
    await page.locator('[data-page="start"]').click(); await page.locator('#home-latest [data-movie-id="latest0"]').waitFor();
    assert.ok(requests.some(r => r.sort === 'DateCreated' && r.start === '0'));
    await page.locator('#home-latest [data-movie-id="latest0"]').click();
    await page.waitForFunction(() => document.getElementById('detail-metadata').textContent === '2020 · 2 Std. · Endet um 01:30 Uhr · Action · Drama');
    await page.clock.runFor(60000);
    await page.waitForFunction(() => document.getElementById('detail-metadata').textContent.indexOf('01:31 Uhr') !== -1);
    assert.equal(await page.locator('#app').evaluate(node => node.scrollTop), 0);
    assert.ok(await page.locator('#detail-modal').evaluate(node => node.getBoundingClientRect().top >= 0));
    await page.keyboard.press('Escape');
    await page.locator('#home-latest [data-movie-id="latest1"]').click();
    await page.waitForFunction(() => document.getElementById('detail-metadata').textContent === '2 Std. · Endet um 01:01 Uhr');
    await page.keyboard.press('Escape');
    await page.locator('[data-page="merkliste"]').click();
    await page.locator('#section-cards [data-movie-id="m1"]').waitFor();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'favorites-filter');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('favorites-filter').textContent === 'Nicht als gesehen markiert');
    await page.waitForTimeout(100);
    assert.ok(requests.some(r => r.favorite === 'true' && r.played === 'false'));
    await page.locator('[data-page="entdecken"]').click();
    await page.locator('#section-cards [data-movie-id="m1"]').waitFor();
    assert.equal(await page.locator('#favorites-filter').textContent(), 'Alle Filme');
    await page.locator('#favorites-filter').click(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'favorites-filter');
    await page.locator('#section-cards [data-movie-id="m1"]').waitFor();
    assert.ok(requests.some(r => r.sort === 'SortName' && r.favorite === null && r.played === 'false'));
    assert.equal(await page.locator('#favorites-filter').isVisible(), true);
    await page.locator('#genre-filter').waitFor({ state: 'visible' });
    await page.locator('#genre-filter').click();
    assert.equal(await page.locator(':focus').getAttribute('data-genre-id'), 'genre1'); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); assert.equal(await page.locator(':focus').getAttribute('data-genre-id'), 'genre2'); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); assert.equal(await page.locator(':focus').getAttribute('id'), 'genre-apply'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('genre-filter').textContent === 'Genres: 2');
    await page.waitForTimeout(100);
    assert.ok(requests.some(r => r.genre === 'genre1,genre2' && r.played === 'false'));
    await page.locator('#collection-actor-filter').click(); await page.locator('#collection-actor-search').fill('Alex'); await page.clock.runFor(400); await page.locator('[data-actor-id=actor1]').click();
    assert.ok(requests.some(r => r.genre === 'genre1,genre2' && r.actor === 'actor1'));
    await page.locator('#genre-filter').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'period-filter');
    await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#period-filter').textContent(), 'Vor 1970');
    await page.locator('#section-cards [data-movie-id="m1"]').waitFor();
    const classicYears = Array.from({ length: 90 }, (_, i) => 1880 + i).join(',');
    assert.ok(requests.some(r => r.years === classicYears && r.genre === 'genre1,genre2' && r.actor === 'actor1' && r.played === 'false'));
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'sort-filter');
    await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#sort-filter').textContent(), 'Älteste zuerst');
    await page.locator('#section-cards [data-movie-id="m1"]').waitFor();
    assert.ok(requests.some(r => r.sort === 'ProductionYear,SortName' && r.order === 'Ascending' && r.years === classicYears));
    await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await page.locator('#section-cards [data-movie-id="m1"]').waitFor();
    assert.ok(requests.some(r => r.sort === 'ProductionYear,SortName' && r.order === 'Descending' && r.years === classicYears));
    await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'sort-filter');
    assert.equal(await page.locator('#sort-filter').textContent(), 'Neueste zuerst');
    await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    assert.ok(requests.some(r => r.sort === 'DateCreated' && r.genre === 'genre1,genre2' && r.played === 'false' && r.years === classicYears));
    await page.locator('#discover-search').click();
    assert.equal(await page.locator(':focus').getAttribute('id'), 'search-input');
    assert.equal(await page.locator('[aria-current="page"]').getAttribute('data-page'), 'entdecken');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'discover-search');
    assert.equal(await page.locator('#collection-actor-filter').textContent(), 'Alex Star');
    assert.equal(await page.locator('#sort-filter').textContent(), 'Zuletzt hinzugefügt');
    assert.equal(await page.locator('#period-filter').textContent(), 'Vor 1970');
    await page.locator('#favorites-filter').click();
    await page.getByRole('button', { name: 'Angefangen', exact: true }).click();
    await page.locator('#section-cards [data-movie-id="latest0"]').waitFor();
    assert.ok(requests.some(r => r.filter === 'IsResumable' && r.years === classicYears && r.actor === 'actor1'));
    const requestCount = requests.length;
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
    assert.equal(await page.locator(':focus').getAttribute('id'), 'favorites-filter');
    assert.equal(await page.locator('#filter-reset').isVisible(), false);
    await page.waitForTimeout(100);
    assert.ok(requests.slice(requestCount).some(r => r.sort === 'SortName' && r.genre === null && r.actor === null && r.played === null && r.years === null && r.filter === null));
    await page.locator('[data-movie-id="seen"] .home-played').waitFor({ state: 'visible' });
    for (const [id, marker] of [['seen', '.home-played'], ['m1', '.card-progress']]) {
      const card = page.locator(`[data-movie-id="${id}"]`);
      assert.ok(await card.evaluate((node, selector) =>
        node.querySelector(selector).getBoundingClientRect().top >= node.querySelector('.poster').getBoundingClientRect().bottom, marker));
    }
    assert.equal(await page.locator('[data-movie-id="seen"] .card-progress').count(), 0);
    assert.equal(await page.locator('[data-movie-id="m1"] .home-played').count(), 0);
    const rewatch = page.locator('[data-movie-id="rewatch"]');
    assert.match(await rewatch.getAttribute('class'), /\bis-watched\b/);
    assert.doesNotMatch(await page.locator('[data-movie-id="m1"]').getAttribute('class'), /\bis-watched\b/);
    assert.equal(await rewatch.locator('.home-played').textContent(), 'Gesehen');
    assert.equal(await rewatch.locator('.home-progress').evaluate(node => node.style.width), '25%');
    assert.ok(await rewatch.evaluate(card => {
      const poster = card.querySelector('.poster').getBoundingClientRect();
      const badge = card.querySelector('.home-played').getBoundingClientRect();
      const progress = card.querySelector('.card-progress').getBoundingClientRect();
      const nextRow = document.querySelector('.movie-row-preview').getBoundingClientRect();
      return poster.bottom < badge.top && badge.bottom < progress.top &&
        badge.right <= poster.right && progress.bottom < nextRow.top;
    }));
    await page.locator('#sort-filter').click();
    await page.getByRole('button', { name: 'Älteste zuerst', exact: true }).click();
    await page.locator('#section-cards [data-movie-id="m1"]').waitFor();
    assert.ok(requests.some(r => r.order === 'Ascending' && r.sort === 'ProductionYear,SortName' &&
      r.years.split(',').at(0) === '1880' && r.years.split(',').at(-1) === '2099' && r.actor === null && r.genre === null));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
