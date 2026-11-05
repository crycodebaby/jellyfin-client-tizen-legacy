'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { DOMParser } = require('@xmldom/xmldom');
const { root, runtimeFiles } = require('./runtime-files.cjs');
const runtime = new Set(runtimeFiles());
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const widgets = 'http://www.w3.org/ns/widgets';
const tizen = 'http://tizen.org/ns/widgets';

// Project invariants only: the Tizen SDK remains responsible for schema validation.
function validateManifest(manifest) {
  const widget = manifest.documentElement;
  assert.ok(widget && widget.localName === 'widget' && widget.namespaceURI === widgets, 'Manifest benötigt ein Widget im W3C-Namensraum.');
  function one(namespace, name) {
    const nodes = manifest.getElementsByTagNameNS(namespace, name);
    assert.equal(nodes.length, 1, `Manifest benötigt genau ein ${name}-Element.`);
    return nodes[0];
  }
  const content = one(widgets, 'content');
  const icon = one(widgets, 'icon');
  const app = one(tizen, 'application');
  const profile = one(tizen, 'profile');
  const setting = one(tizen, 'setting');
  const packageId = app.getAttribute('package');
  const appId = app.getAttribute('id');
  assert.ok(packageId && appId.startsWith(`${packageId}.`) && appId.length > packageId.length + 1,
    'Anwendungs-ID muss aus Paket-ID und nichtleerem App-Namen bestehen.');
  assert.equal(app.getAttribute('required_version'), '2.3');
  assert.equal(profile.getAttribute('name'), 'tv-samsung', 'Samsung-TV-Profil fehlt.');
  assert.equal(setting.getAttribute('hwkey-event'), 'enable', 'Hardware-Tastenereignisse müssen aktiviert sein.');
  assert.ok(Array.from(manifest.getElementsByTagNameNS(tizen, 'privilege')).some((node) => node.getAttribute('name') === 'http://tizen.org/privilege/internet'), 'Internetberechtigung fehlt.');
  assert.ok(Array.from(manifest.getElementsByTagNameNS(widgets, 'access')).some((node) => node.getAttribute('origin') === '*' && node.getAttribute('subdomains') === 'true'), 'Projekt benötigt Zugriff auf die editierbare Serveradresse.');
  assert.ok(content.getAttribute('src') && icon.getAttribute('src'), 'Manifest benötigt Inhalt und Icon.');
  return { content, icon };
}

if (require.main === module) {

for (const file of ['app.js', 'banner-texts.js', 'diagnostics.js', 'jellyfin-http.js', 'jellyfin-client.js', 'companion-tv.js', 'device-defaults.js', 'playback.js', 'avplay-adapter.js', 'branding/config.js']) {
  acorn.parse(read(file), { ecmaVersion: 5, sourceType: 'script' });
}
console.log('ES5-Syntax der TV-Laufzeit geprüft.');

function parseXml(file) {
  return new DOMParser({ onError(level, message) { throw new Error(`${file}: ${level}: ${message}`); } })
    .parseFromString(read(file), 'application/xml');
}

const manifest = parseXml('config.xml');
const { content, icon } = validateManifest(manifest);

function requireRuntimeAsset(reference, from) {
  if (!reference || /^(?:https?:|data:|#)/i.test(reference) || reference === '$WEBAPIS/webapis/webapis.js') return;
  const relative = path.posix.normalize(reference);
  assert.ok(!relative.startsWith('../') && !relative.startsWith('/'), `${from}: Pfad außerhalb des Projekts: ${reference}`);
  assert.ok(fs.existsSync(path.join(root, relative)), `${from}: Datei fehlt: ${relative}`);
  assert.ok(runtime.has(relative), `${from}: Datei fehlt im Tizen-Laufzeitpaket: ${relative}`);
}
requireRuntimeAsset(content.getAttribute('src'), 'config.xml');
requireRuntimeAsset(icon.getAttribute('src'), 'config.xml');
for (const match of read('index.html').matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) requireRuntimeAsset(match[1], 'index.html');
for (const match of read('styles.css').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) requireRuntimeAsset(match[1], 'styles.css');
for (const file of runtimeFiles().filter((name) => name.endsWith('.svg'))) {
  assert.equal(parseXml(file).documentElement.localName, 'svg', `${file}: kein SVG`);
}
console.log('Manifest, SVG-Dateien und Laufzeitverweise geprüft.');

const markdown = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'SECURITY.md', 'TASKS.md', 'branding/README.md']
  .concat(fs.readdirSync(path.join(root, 'docs')).filter((name) => name.endsWith('.md')).map((name) => `docs/${name}`));
for (const file of markdown) {
  const text = read(file).replace(/```[\s\S]*?```/g, '');
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const reference = match[1].split('#')[0];
    if (!reference || /^(?:https?:|mailto:)/i.test(reference)) continue;
    const destination = path.resolve(root, path.dirname(file), decodeURIComponent(reference));
    assert.ok(destination === root || destination.startsWith(root + path.sep), `${file}: Link außerhalb des Projekts`);
    assert.ok(fs.existsSync(destination), `${file}: Linkziel fehlt: ${reference}`);
  }
}
console.log('Lokale Dokumentationslinks geprüft.');
}

module.exports = { validateManifest };
