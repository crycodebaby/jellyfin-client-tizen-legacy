'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const { createPreviewServer } = require('../scripts/preview.cjs');
const { root, runtimeFiles } = require('../scripts/runtime-files.cjs');
let server;
let browser;
let base;

before(async () => {
  server = createPreviewServer({ mockInfo: { ServerName: 'Testserver', Version: '0.0' } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function withPage(run) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-page') === 'start');
    await run(page);
    assert.deepEqual(errors, [], 'Keine unbehandelten JavaScript-Fehler');
  } finally { await page.close(); }
}

async function press(page, ...keys) {
  for (const key of keys) await page.keyboard.press(key);
}

test('Steuerkreuz öffnet Film und kehrt zum Fokus zurück', async () => withPage(async (page) => {
  await press(page, 'ArrowDown', 'Enter', 'ArrowRight', 'Enter');
  assert.equal(await page.locator('#detail-title').textContent(), 'Fernes Licht');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'save-button');
  await press(page, 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-item'), '0');
  await press(page, 'ArrowLeft', 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-page'), 'start');
}));

test('Suche filtert Beispieltitel', async () => withPage(async (page) => {
  await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowRight');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'search-input');
  await page.locator('#search-input').fill('Nacht');
  assert.equal(await page.locator('#section-cards button').count(), 1);
  assert.match(await page.locator('#section-cards').textContent(), /Nachtlinie/);
}));

test('Beispieltitel lassen sich merken und entfernen', async () => withPage(async (page) => {
  await press(page, 'ArrowRight', 'ArrowDown', 'Enter', 'Enter', 'Escape', 'ArrowLeft');
  await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter');
  assert.equal(await page.locator('#section-cards button').count(), 1);
  await press(page, 'ArrowRight', 'Enter', 'Enter', 'Escape');
  assert.match(await page.locator('#empty-state').textContent(), /Noch keine Beispieltitel/);
  assert.equal(await page.locator(':focus').getAttribute('data-page'), 'merkliste');
}));

test('Entdecken öffnet ein Duo und stellt den Fokus wieder her', async () => withPage(async (page) => {
  await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'Enter');
  assert.equal(await page.locator('#detail-title').textContent(), 'Darsteller A & B');
  assert.equal(await page.locator('#save-button').isVisible(), false);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'detail-close');
  await press(page, 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-item'), '7');
}));

test('Serverdialog prüft Eingaben und verarbeitet eine lokale Testantwort', async () => withPage(async (page) => {
  await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'Enter');
  assert.match(await page.locator('#connection-status').textContent(), /gültige Adresse/);
  await page.locator('#server-url').fill(base);
  await press(page, 'ArrowDown', 'Enter');
  await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Verbunden mit Testserver') !== -1);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#connection-orbit').isVisible(), false, 'Schnelle Antworten blitzen nicht nachträglich auf');
  assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  await press(page, 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-action'), 'connection');
}));

test('30 schnelle Richtungswechsel und Wechsel zwischen Inhaltsreihen bleiben synchron', async () => withPage(async (page) => {
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-page'), i % 2 ? 'start' : 'filme');
  }
  await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowRight');
  for (let i = 0; i < 6; i += 1) {
    await press(page, 'ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-zone'), 'people');
    await press(page, 'ArrowUp');
    assert.equal(await page.locator(':focus').getAttribute('data-zone'), 'cards');
  }
}));

test('Langsame Anfrage zeigt Orbit, ignoriert Doppelstart und räumt nach Erfolg auf', async () => withPage(async (page) => {
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/System/Info/Public', async (route) => {
    calls += 1;
    await gate;
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ServerName":"Langsam"}' }); } catch {}
  });
  try {
    await press(page, 'ArrowRight', 'Enter');
    await page.locator('#server-url').fill(base);
    await press(page, 'ArrowDown', 'Enter');
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'true');
    await press(page, 'Enter', 'Enter', 'Enter');
    assert.equal(calls, 1);
    release();
    await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Verbunden mit Langsam') !== -1);
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
    await press(page, 'Enter');
    await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Verbunden mit Langsam') !== -1);
    assert.equal(calls, 2, 'Nach Abschluss ist eine erneute Prüfung möglich');
  } finally { release(); }
}));

test('Abbruch beim Verlassen verhindert veraltete Netzwerkantworten', async () => withPage(async (page) => {
  let release;
  let routeDone;
  const gate = new Promise((resolve) => { release = resolve; });
  const done = new Promise((resolve) => { routeDone = resolve; });
  await page.route('**/System/Info/Public', async (route) => {
    await gate;
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ServerName":"Veraltet"}' }); } catch {}
    routeDone();
  });
  try {
    await press(page, 'ArrowRight', 'Enter');
    await page.locator('#server-url').fill(base);
    await press(page, 'ArrowDown', 'Enter');
    await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
    await press(page, 'Escape', 'ArrowLeft', 'ArrowDown', 'Enter');
    assert.equal(await page.locator('#page-title').textContent(), 'Filme');
    release();
    await done;
    await page.locator('#profile-button').click();
    assert.match(await page.locator('#connection-status').textContent(), /abgebrochen/);
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  } finally { release(); }
}));

test('HTTP-Fehler beendet Laden und erlaubt Wiederholung', async () => withPage(async (page) => {
  let calls = 0;
  await page.route('**/System/Info/Public', async (route) => {
    calls += 1;
    await route.fulfill(calls === 1 ? { status: 503, body: 'offline' } : { status: 200, contentType: 'application/json', body: '{"ServerName":"Wieder da"}' });
  });
  await press(page, 'ArrowRight', 'Enter');
  await page.locator('#server-url').fill(base);
  await press(page, 'ArrowDown', 'Enter');
  await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('HTTP 503') !== -1);
  assert.equal(await page.locator('#connection-orbit').isVisible(), false);
  assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  await press(page, 'Enter');
  await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Wieder da') !== -1);
  assert.equal(calls, 2);
}));

test('Eine geänderte Adresse entwertet die laufende Antwort', async () => withPage(async (page) => {
  let release;
  let routeDone;
  const gate = new Promise((resolve) => { release = resolve; });
  const done = new Promise((resolve) => { routeDone = resolve; });
  await page.route('**/System/Info/Public', async (route) => {
    await gate;
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ServerName":"Alt"}' }); } catch {}
    routeDone();
  });
  try {
    await press(page, 'ArrowRight', 'Enter');
    await page.locator('#server-url').fill(base);
    await press(page, 'ArrowDown', 'Enter');
    await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
    await page.locator('#server-url').fill('http://anderer-server:8096');
    release();
    await done;
    assert.match(await page.locator('#connection-status').textContent(), /Adresse geändert/);
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  } finally { release(); }
}));

test('Orbit bleibt in reduzierten und ausgeschalteten Modi sichtbar, aber unbewegt', async () => {
  for (const mode of ['reduced', 'off']) {
    await withPage(async (page) => {
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      await page.route('**/System/Info/Public', async (route) => {
        await gate;
        try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch {}
      });
      try {
        await press(page, 'ArrowRight', 'Enter');
        await page.locator(`[data-mode="${mode}"]`).click();
        await page.locator('#server-url').fill(base);
        await page.locator('#check-server').click();
        await page.waitForFunction(() => document.getElementById('connection-orbit').className.indexOf('is-visible') !== -1);
        assert.equal(await page.locator('#connection-orbit').evaluate((element) => getComputedStyle(element).animationName), 'none');
        await press(page, 'Escape');
      } finally { release(); }
    });
  }
});

test('Zeitüberschreitung beendet den Ladezustand mit passender Meldung', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.addInitScript(() => {
      function TimeoutRequest() { this.readyState = 0; this.status = 0; }
      TimeoutRequest.prototype.open = function () {};
      TimeoutRequest.prototype.send = function () {
        const self = this;
        setTimeout(() => {
          self.readyState = 4;
          if (self.onreadystatechange) self.onreadystatechange();
          if (self.ontimeout) self.ontimeout();
        }, 20);
      };
      TimeoutRequest.prototype.abort = function () {};
      window.XMLHttpRequest = TimeoutRequest;
    });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-page') === 'start');
    await press(page, 'ArrowRight', 'Enter');
    await page.locator('#server-url').fill('http://example.invalid');
    await press(page, 'ArrowDown', 'Enter');
    await page.waitForFunction(() => document.getElementById('connection-status').textContent.indexOf('Zeitüberschreitung') !== -1);
    assert.equal(await page.locator('#connection-orbit').isVisible(), false);
    assert.equal(await page.locator('#check-server').getAttribute('aria-disabled'), 'false');
  } finally { await page.close(); }
});

test('Tastendruck gibt sofort Rückmeldung und setzt den Merken-Zustand', async () => withPage(async (page) => {
  await press(page, 'ArrowRight', 'ArrowDown', 'Enter');
  await page.keyboard.down('Enter');
  assert.equal(await page.locator('#save-button').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#save-button').getAttribute('class'), /is-pressed/);
  await page.keyboard.up('Enter');
  assert.doesNotMatch(await page.locator('#save-button').getAttribute('class'), /is-pressed/);
}));

test('Motion aus ist per Fernbedienung nutzbar und bleibt nach Neustart erhalten', async () => withPage(async (page) => {
  await press(page, 'ArrowRight', 'Enter', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter');
  assert.equal(await page.locator('[data-mode="off"]').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#app').getAttribute('class'), /motion-off/);
  await press(page, 'Escape', 'ArrowDown', 'Enter');
  assert.equal(await page.locator('#detail-title').textContent(), 'Fernes Licht');
  await page.keyboard.down('Enter');
  assert.equal(await page.locator('#save-button').getAttribute('aria-pressed'), 'true');
  await page.keyboard.up('Enter');
  await press(page, 'Escape', 'ArrowLeft');
  for (let i = 0; i < 30; i += 1) await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown');
  assert.equal(await page.locator(':focus').getAttribute('data-page'), 'start');
  await page.reload();
  assert.match(await page.locator('#app').getAttribute('class'), /motion-off/);
  const motion = await page.locator('.poster').first().evaluate((element) => ({ animation: getComputedStyle(element).animationName, transition: getComputedStyle(element).transitionDuration }));
  assert.equal(motion.animation, 'none');
  assert.equal(motion.transition, '0s');
}));

test('Systemvorgabe und fehlende Legacy-APIs führen zu reduziertem Motion-Modus', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  try {
    await page.goto(base, { waitUntil: 'load' });
    assert.match(await page.locator('#app').getAttribute('class'), /motion-reduced/);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.getElementById('app').className.indexOf('motion-full') !== -1);
  } finally { await page.close(); }
  const legacy = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await legacy.addInitScript(() => {
      window.matchMedia = undefined;
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage unavailable'); } });
    });
    await legacy.goto(base, { waitUntil: 'load' });
    assert.match(await legacy.locator('#app').getAttribute('class'), /motion-reduced/);
    await legacy.locator('#profile-button').click();
    await legacy.locator('[data-mode="full"]').click();
    assert.match(await legacy.locator('#app').getAttribute('class'), /motion-full/);
  } finally { await legacy.close(); }
  const unsupported = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await unsupported.addInitScript(() => { window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} }); });
    await unsupported.goto(base, { waitUntil: 'load' });
    assert.match(await unsupported.locator('#app').getAttribute('class'), /motion-reduced/);
  } finally { await unsupported.close(); }
});

test('Diagnose bleibt standardmäßig aus und sammelt nur nach Opt-in lokale Messungen', async () => withPage(async (page) => {
  assert.equal(await page.evaluate(() => typeof window.SMAIRYS_DIAGNOSTICS), 'undefined');
  await page.goto(base + '/?diagnostics=1', { waitUntil: 'load' });
  await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-page') === 'start');
  await press(page, 'ArrowDown');
  await page.waitForFunction(() => window.SMAIRYS_DIAGNOSTICS.snapshot().entries.some((entry) => entry.type === 'focus-frame-callback'));
  const snapshot = await page.evaluate(() => window.SMAIRYS_DIAGNOSTICS.snapshot());
  assert.ok(snapshot.entries.some((entry) => entry.type === 'focus-dom'));
  assert.equal(snapshot.visibleCards, 5);
  assert.equal(JSON.stringify(snapshot).includes(base), false);
}));

test('Markenwerte lassen sich zentral austauschen', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.route('**/branding/config.js', (route) => route.fulfill({
      status: 200, contentType: 'application/javascript',
      body: "window.SMAIRYS_BRANDING={appTitle:'Eigenes Kino',headerName:'EIGEN',headerSubtitle:'KINO',avatarInitial:'E',slogan:'Mein Kino'};"
    }));
    await page.goto(base, { waitUntil: 'load' });
    assert.equal(await page.title(), 'Eigenes Kino');
    assert.equal(await page.locator('#brand-name-main').textContent(), 'EIGEN');
    assert.equal(await page.locator('#brand-name-sub').textContent(), 'KINO');
    assert.equal(await page.locator('#brand-avatar').textContent(), 'E');
    assert.equal(await page.locator('.brand').getAttribute('aria-label'), 'Eigenes Kino – Mein Kino');
  } finally { await page.close(); }
});

test('Tizen-Vorbereitung enthält nur die erlaubten Laufzeitdateien', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/prepare-runtime.cjs')], { cwd: root, stdio: 'pipe' });
  const target = path.join(root, '.build', 'runtime');
  function filesAt(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory() ? filesAt(path.join(directory, entry.name), name) : [name];
    });
  }
  assert.deepEqual(filesAt(target).sort(), runtimeFiles().sort());
  for (const forbidden of ['SKILL.md', '.env', 'node_modules', 'docs', '.github', 'tests']) {
    assert.equal(fs.existsSync(path.join(target, forbidden)), false, `${forbidden} gehört nicht ins Paket`);
  }
});

test('Git ignoriert private und generierte Dateien, aber keine Projektdateien', () => {
  const ignored = ['.env.local', '.npmrc', 'private/test.p12', 'private/test.key', 'private/test.p8', 'profiles.xml', '.build/runtime/config.xml', 'example.wgt', 'node_modules/test/index.js'];
  const kept = ['branding/config.js', 'assets/poster-horizon.svg', 'README.md', 'SKILL.md', '.env.example'];
  function ignoreStatus(file) {
    const result = spawnSync('git', ['-c', `safe.directory=${root.replace(/\\/g, '/')}`, 'check-ignore', '--no-index', '-q', '--', file], { cwd: root });
    assert.ok(result.status === 0 || result.status === 1, 'Git-Ignore-Prüfung konnte ausgeführt werden');
    return result.status === 0;
  }
  for (const file of ignored) assert.equal(ignoreStatus(file), true, `${file} muss ignoriert werden`);
  for (const file of kept) assert.equal(ignoreStatus(file), false, `${file} darf nicht ignoriert werden`);
});
