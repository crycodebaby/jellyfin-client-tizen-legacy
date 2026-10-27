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
  await press(page, 'Escape');
  assert.equal(await page.locator(':focus').getAttribute('data-action'), 'connection');
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
  const kept = ['branding/config.js', 'assets/poster-horizon.svg', 'README.md', 'SKILL.md'];
  function ignoreStatus(file) {
    const result = spawnSync('git', ['-c', `safe.directory=${root.replace(/\\/g, '/')}`, 'check-ignore', '--no-index', '-q', '--', file], { cwd: root });
    assert.ok(result.status === 0 || result.status === 1, 'Git-Ignore-Prüfung konnte ausgeführt werden');
    return result.status === 0;
  }
  for (const file of ignored) assert.equal(ignoreStatus(file), true, `${file} muss ignoriert werden`);
  for (const file of kept) assert.equal(ignoreStatus(file), false, `${file} darf nicht ignoriert werden`);
});
