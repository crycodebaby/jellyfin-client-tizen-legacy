'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { root, runtimeFiles } = require('./runtime-files.cjs');
const build = path.join(root, '.build');

if (fs.existsSync(build) && fs.lstatSync(build).isSymbolicLink()) {
  throw new Error('.build darf kein symbolischer Link sein.');
}
fs.mkdirSync(build, { recursive: true });
const rootReal = fs.realpathSync(root);
const buildReal = fs.realpathSync(build);
if (!buildReal.startsWith(rootReal + path.sep)) {
  throw new Error('Der Build-Ordner liegt außerhalb des Projekts.');
}
const target = path.join(buildReal, 'runtime');
if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
  throw new Error('Das Build-Ziel darf kein symbolischer Link sein.');
}
fs.rmSync(target, { recursive: true, force: true });
for (const relative of runtimeFiles()) {
  const source = path.join(root, relative);
  if (!fs.lstatSync(source).isFile()) throw new Error(`Keine reguläre Datei: ${relative}`);
  const destination = path.join(target, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
console.log(`Tizen-Laufzeitdateien vorbereitet: ${target}`);
console.log('Die Paketierung und Signierung mit Tizen CLI sind noch erforderlich.');
