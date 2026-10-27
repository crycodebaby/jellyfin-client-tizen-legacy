'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const { DOMParser } = require('@xmldom/xmldom');
const { root, runtimeFiles } = require('./runtime-files.cjs');
const runtime = new Set(runtimeFiles());
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

for (const file of ['app.js', 'diagnostics.js', 'branding/config.js']) {
  acorn.parse(read(file), { ecmaVersion: 5, sourceType: 'script' });
}
console.log('ES5-Syntax der TV-Laufzeit geprüft.');

function parseXml(file) {
  return new DOMParser({ onError(level, message) { throw new Error(`${file}: ${level}: ${message}`); } })
    .parseFromString(read(file), 'application/xml');
}

const manifest = parseXml('config.xml');
assert.equal(manifest.documentElement.localName, 'widget');
const widgets = 'http://www.w3.org/ns/widgets';
const tizen = 'http://tizen.org/ns/widgets';
const content = manifest.getElementsByTagNameNS(widgets, 'content')[0];
const icon = manifest.getElementsByTagNameNS(widgets, 'icon')[0];
const app = manifest.getElementsByTagNameNS(tizen, 'application')[0];
assert.ok(content && icon && app, 'Manifest benötigt content, icon und tizen:application.');
assert.equal(app.getAttribute('required_version'), '2.3');

function requireRuntimeAsset(reference, from) {
  if (!reference || /^(?:https?:|data:|#)/i.test(reference)) return;
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
