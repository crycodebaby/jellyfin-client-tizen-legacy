'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { root, runtimeFiles } = require('./runtime-files.cjs');
const build = path.join(root, '.build');
const runtime = path.join(build, 'runtime');
const result = path.join(runtime, '.buildResult');
const rootReal = fs.realpathSync(root);
if (fs.lstatSync(build).isSymbolicLink() || !fs.realpathSync(build).startsWith(rootReal + path.sep) ||
    fs.lstatSync(runtime).isSymbolicLink() || !fs.realpathSync(runtime).startsWith(fs.realpathSync(build) + path.sep)) {
  throw new Error('Build- und Laufzeitordner müssen innerhalb des Projekts liegen.');
}
const runtimeRoot = fs.realpathSync(runtime);
if (fs.lstatSync(result).isSymbolicLink() || !fs.realpathSync(result).startsWith(runtimeRoot + path.sep)) {
  throw new Error('Das Build-Ergebnis muss im vorbereiteten Laufzeitordner liegen.');
}

function filesAt(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Symbolischer Link im Build-Ergebnis: ${name}`);
    if (entry.isDirectory()) return filesAt(path.join(directory, entry.name), name);
    if (!entry.isFile()) throw new Error(`Unerwarteter Dateityp im Build-Ergebnis: ${name}`);
    return [name];
  });
}

const expected = runtimeFiles().slice().sort();
const actual = filesAt(result).sort();
if (JSON.stringify(expected) !== JSON.stringify(actual)) {
  throw new Error('Build-Ergebnis enthält fehlende oder zusätzliche Dateien.');
}
for (const file of expected) {
  const digest = (name) => crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex');
  if (digest(path.join(root, file)) !== digest(path.join(result, file))) {
    throw new Error(`Build-Datei unterscheidet sich vom Quellstand: ${file}`);
  }
}
console.log(`Web-Build geprüft: ${actual.length} vorgesehene Laufzeitdateien stimmen mit dem Quellstand überein.`);
console.log('Das Ergebnis ist weder ein signiertes WGT noch ein TV-Kompatibilitätsnachweis.');
