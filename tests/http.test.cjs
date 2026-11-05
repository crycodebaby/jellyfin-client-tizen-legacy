'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const requests = [];
  function FakeXHR() { requests.push(this); this.headers = {}; }
  FakeXHR.prototype.open = function (method, url) { this.method = method; this.url = url; };
  FakeXHR.prototype.setRequestHeader = function (key, value) { this.headers[key] = value; };
  FakeXHR.prototype.send = function (body) { this.body = body; };
  FakeXHR.prototype.abort = function () { this.aborted = true; };
  const window = { setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../jellyfin-http.js'), 'utf8'), { window, XMLHttpRequest: FakeXHR, JSON });
  return { http: window.SMAIRYS_HTTP, requests };
}

test('HTTP-Schicht übergibt Methode, Header und JSON-Antwort', () => {
  const { http, requests } = setup();
  let result;
  http.request({ method: 'POST', url: 'http://example.invalid/test', headers: { Authorization: 'test' }, body: '{}' }, (error, data) => { result = { error, data }; });
  const xhr = requests[0];
  assert.equal(xhr.method, 'POST');
  assert.equal(xhr.headers.Authorization, 'test');
  assert.equal(xhr.body, '{}');
  xhr.status = 200; xhr.responseText = '{"Id":"abc"}'; xhr.readyState = 4; xhr.onreadystatechange();
  assert.equal(result.error, null);
  assert.equal(result.data.Id, 'abc');
});

test('HTTP-, Parsing- und Timeoutfehler sind unterscheidbar', () => {
  for (const kind of ['http', 'parse', 'timeout']) {
    const { http, requests } = setup();
    let result;
    http.request({ url: 'http://example.invalid' }, (error) => { result = error; });
    const xhr = requests[0];
    if (kind === 'timeout') xhr.ontimeout();
    else { xhr.status = kind === 'http' ? 401 : 200; xhr.responseText = 'invalid'; xhr.readyState = 4; xhr.onreadystatechange(); }
    assert.equal(result.type, kind);
    if (kind === 'http') assert.equal(result.status, 401);
  }
});

test('Abbruch unterdrückt verspätete Antworten', () => {
  const { http, requests } = setup();
  let calls = 0;
  const handle = http.request({ url: 'http://example.invalid' }, () => { calls += 1; });
  const xhr = requests[0];
  const stale = xhr.onreadystatechange;
  handle.abort();
  xhr.status = 200; xhr.responseText = '{}'; xhr.readyState = 4; stale();
  assert.equal(xhr.aborted, true);
  assert.equal(calls, 0);
});

test('Leere 204-Antworten sind nur bei erwarteten leeren Antworten gültig', () => {
  for (const allowEmpty of [true, false]) {
    const { http, requests } = setup();
    let result;
    http.request({ url: 'http://example.invalid', emptyResponse: allowEmpty }, (error, data) => { result = { error, data }; });
    const xhr = requests[0];
    xhr.status = 204; xhr.responseText = ''; xhr.readyState = 4; xhr.onreadystatechange();
    assert.equal(result.error ? result.error.type : null, allowEmpty ? null : 'parse');
    if (allowEmpty) assert.equal(result.data, null);
  }
});

test('Fehlender XHR-Konstruktor wird als Fehler gemeldet und ist abbrechbar', async () => {
  const window = { setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../jellyfin-http.js'), 'utf8'), { window, JSON });
  const result = await new Promise((resolve) => window.SMAIRYS_HTTP.request({ url: 'http://example.invalid' }, resolve));
  assert.equal(result.type, 'open');
  let called = false;
  const handle = window.SMAIRYS_HTTP.request({ url: 'http://example.invalid' }, () => { called = true; });
  handle.abort();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(called, false);
});

test('HTTP transport returns subtitle text without JSON parsing', () => {
  const { http, requests } = setup(); let result;
  http.request({ url: 'http://example.invalid/subtitle', responseText: true }, (error, data) => { result = { error, data }; });
  const xhr = requests[0]; xhr.status = 200; xhr.responseText = 'WEBVTT\n\n'; xhr.readyState = 4; xhr.onreadystatechange();
  assert.equal(result.error, null); assert.equal(result.data, 'WEBVTT\n\n');
});
