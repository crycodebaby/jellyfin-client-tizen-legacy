'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DOMParser } = require('@xmldom/xmldom');
const { validateManifest } = require('../scripts/check-project.cjs');
const source = fs.readFileSync(path.join(__dirname, '..', 'config.xml'), 'utf8');
const tizen = 'http://tizen.org/ns/widgets';
const widgets = 'http://www.w3.org/ns/widgets';

function documentForTest() { return new DOMParser().parseFromString(source, 'application/xml'); }
function node(document, namespace, name) { return document.getElementsByTagNameNS(namespace, name)[0]; }

test('Das Projektmanifest erfüllt die lokalen Mindestanforderungen', () => {
  assert.doesNotThrow(() => validateManifest(documentForTest()));
});

test('Falsches TV-Profil, inkonsistente App-ID und deaktivierte Hardwaretasten werden erkannt', () => {
  const changes = [
    ['profile', 'name', 'mobile'],
    ['application', 'id', 'OtherPackage.Mediathek'],
    ['application', 'id', 'SmairysMed.'],
    ['application', 'package', ''],
    ['setting', 'hwkey-event', 'disable']
  ];
  for (const [tag, attribute, value] of changes) {
    const document = documentForTest();
    node(document, tizen, tag).setAttribute(attribute, value);
    assert.throws(() => validateManifest(document), `${tag}.${attribute}=${value}`);
  }
});

test('Fehlender Netzwerkzugriff, fehlendes Icon und doppelte Tizen-Definitionen werden erkannt', () => {
  const noAccess = documentForTest();
  node(noAccess, widgets, 'access').setAttribute('origin', 'http://example.invalid');
  assert.throws(() => validateManifest(noAccess));
  const noPrivilege = documentForTest();
  node(noPrivilege, tizen, 'privilege').setAttribute('name', 'other');
  assert.throws(() => validateManifest(noPrivilege));
  const noIcon = documentForTest();
  node(noIcon, widgets, 'icon').setAttribute('src', '');
  assert.throws(() => validateManifest(noIcon));
  const duplicate = documentForTest();
  const profile = node(duplicate, tizen, 'profile');
  profile.parentNode.appendChild(profile.cloneNode(true));
  assert.throws(() => validateManifest(duplicate));
});
