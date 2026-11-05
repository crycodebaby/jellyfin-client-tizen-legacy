'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');
const source = fs.readFileSync('avplay-adapter.js', 'utf8');
const controllerSource = fs.readFileSync('playback.js', 'utf8');

function setup() {
  const window = {};
  vm.runInNewContext(source, {window, isFinite});
  vm.runInNewContext(controllerSource, {window, isFinite});
  const fake = {
    calls: [], listeners: [], prepares: [], seeks: [],
    open(value) { this.calls.push(['open', value]); },
    close() { this.calls.push(['close']); },
    stop() { this.calls.push(['stop']); },
    setListener(value) { this.listeners.push(value); },
    setDisplayRect(...value) { this.calls.push(['rect', ...value]); },
    prepareAsync(ok, error) { this.prepares.push({ok, error}); },
    play() { this.calls.push(['play']); },
    pause() { this.calls.push(['pause']); },
    seekTo(ms, ok, error) { this.seeks.push({ms, ok, error}); },
    getCurrentTime() { return 1500; }, getDuration() { return 12000; }
  };
  const adapter = window.SMAIRYS_AVPLAY.create(fake);
  return {window, fake, adapter, controller: window.SMAIRYS_PLAYBACK.createController(adapter)};
}

test('AVPlay-Adapter ist ES5 und prüft die notwendige API', () => {
  acorn.parse(source, {ecmaVersion: 5});
  const {window} = setup();
  assert.throws(() => window.SMAIRYS_AVPLAY.create({}), /avplay-unavailable/);
});

test('Stop während einer Suche schließt AVPlay erst nach dem Suchrückruf', () => {
  const {fake, controller} = setup();
  controller.load('test'); fake.prepares[0].ok();
  controller.seek(5);
  const before = fake.calls.length;
  controller.stop();
  assert.equal(fake.calls.length, before);
  fake.seeks[0].ok();
  assert.deepEqual(fake.calls.slice(-2), [['stop'], ['close']]);
  assert.equal(controller.getState(), 'stopped');
});

test('Controller steuert AVPlay samt Pause, Pufferung, Suche und Ende', () => {
  const {fake, adapter, controller} = setup();
  assert.equal(controller.load('test'), true);
  assert.deepEqual(fake.calls.slice(0, 2), [['open', 'test'], ['rect', 0, 0, 1920, 1080]]);
  fake.prepares[0].ok();
  assert.equal(controller.getState(), 'playing');
  fake.listeners[0].onbufferingstart();
  assert.equal(controller.getState(), 'buffering');
  fake.listeners[0].onbufferingcomplete();
  assert.equal(controller.getState(), 'playing');
  assert.equal(controller.pause(), true);
  assert.equal(controller.seek(2.5), true);
  assert.equal(fake.seeks[0].ms, 2500);
  fake.seeks[0].ok();
  assert.equal(controller.getState(), 'paused');
  assert.equal(adapter.getPosition(), 1.5);
  assert.equal(adapter.getDuration(), 12);
  fake.listeners[0].onstreamcompleted();
  assert.equal(controller.getState(), 'stopped');
  assert.deepEqual(fake.calls.slice(-2), [['stop'], ['close']]);
  assert.equal(adapter.getPosition(), 1.5, 'Letzte Position bleibt für die Abschlussmeldung erhalten');
});

test('Alte Vorbereitung, Listener und Suche können neue Wiedergabe nicht beeinflussen', () => {
  const {fake, controller} = setup();
  controller.load('first');
  const old = fake.listeners[0];
  controller.load('second');
  fake.prepares[0].ok(); old.onerror(); old.onstreamcompleted();
  assert.equal(controller.getState(), 'preparing');
  fake.prepares[1].ok();
  fake.prepares[1].error();
  assert.equal(controller.getState(), 'playing');
  controller.seek(3); fake.seeks[0].ok();
  controller.seek(4); fake.seeks[0].error();
  assert.equal(controller.getState(), 'seeking');
  fake.seeks[1].ok();
  assert.equal(controller.getState(), 'playing');
  controller.stop(); old.onbufferingstart(); fake.listeners[1].onerror();
  assert.equal(controller.getState(), 'stopped');
});

test('Natürliches Ende übernimmt die aktuelle native Position vor dem Schließen', () => {
  const {fake, adapter, controller} = setup();
  controller.load('test'); fake.prepares[0].ok();
  fake.listeners[0].oncurrentplaytime(8000);
  fake.getCurrentTime = () => 11500;
  fake.listeners[0].onstreamcompleted();
  assert.equal(adapter.getPosition(), 11.5);
});

test('Ungültige Endpositionen, alte Listener und laufende Suche lesen keine falsche Position', () => {
  for (const value of [NaN, Infinity, -1, '1000', null]) {
    const {fake, adapter, controller} = setup();
    controller.load('test'); fake.prepares[0].ok();
    fake.listeners[0].oncurrentplaytime(8000);
    fake.getCurrentTime = () => value;
    fake.listeners[0].onstreamcompleted();
    assert.equal(adapter.getPosition(), 8);
  }
  const {fake, adapter, controller} = setup();
  controller.load('first'); const old = fake.listeners[0];
  controller.load('second'); fake.prepares[1].ok();
  fake.listeners[1].oncurrentplaytime(4000);
  let reads = 0;
  fake.getCurrentTime = () => { reads++; throw new Error('native failure'); };
  old.onstreamcompleted();
  assert.equal(reads, 0);
  controller.seek(5);
  fake.listeners[1].onstreamcompleted();
  assert.equal(reads, 0);
  fake.seeks[0].ok();
  assert.equal(adapter.getPosition(), 4);
});

test('Fehler beim Lesen der Endposition erhält die letzte bekannte Position', () => {
  const {fake, adapter, controller} = setup();
  controller.load('test'); fake.prepares[0].ok();
  fake.listeners[0].oncurrentplaytime(7000);
  fake.getCurrentTime = () => { throw new Error('native failure'); };
  fake.listeners[0].onstreamcompleted();
  assert.equal(adapter.getPosition(), 7);
});

test('Fehler und Stop räumen auch bei fehlschlagendem nativen Stop auf', () => {
  const {fake, controller} = setup();
  controller.load('test');
  fake.stop = function () { throw new Error('native stop'); };
  fake.prepares[0].error();
  assert.equal(controller.getState(), 'error');
  assert.deepEqual(fake.calls.slice(-1), [['close']]);
  fake.prepares[0].ok();
  assert.equal(controller.getState(), 'error');
});

test('Spuren nutzen native Indizes und lesen Sprachmetadaten defensiv', () => {
  const {fake, adapter} = setup();
  fake.getState = () => 'PLAYING';
  fake.getTotalTrackInfo = () => [
    {type: 'AUDIO', index: 7, extra_info: '{"track_lang":"de"}'},
    {type: 'TEXT', index: 12, extra_info: {track_lang: 'en'}},
    {type: 'TEXT', index: 19, extra_info: '{broken'},
    {type: 'VIDEO', index: 0}, {type: 'AUDIO', index: -1}
  ];
  fake.getCurrentStreamInfo = () => [{type: 'AUDIO', index: 7, extra_info: '{}'}];
  fake.setSelectTrack = (type, index) => fake.calls.push([type, index]);
  adapter.prepare('test', () => {});
  assert.deepEqual(JSON.parse(JSON.stringify(adapter.getTracks())), {ok: true, tracks: [
    {type: 'AUDIO', index: 7, language: 'de'}, {type: 'TEXT', index: 12, language: 'en'}, {type: 'TEXT', index: 19, language: ''}
  ]});
  assert.equal(adapter.getCurrentTracks().tracks[0].index, 7);
  assert.equal(adapter.selectTrack('TEXT', 12).ok, true);
  assert.deepEqual(fake.calls.at(-1), ['TEXT', 12]);
  assert.equal(adapter.selectTrack('VIDEO', 0).error, 'invalid-track');
  assert.equal(adapter.selectTrack('AUDIO', 1.5).error, 'invalid-track');
});

test('Spuraufrufe respektieren Zustand, laufende Suche und native Fehler', () => {
  const {fake, adapter} = setup();
  let state = 'READY';
  fake.getState = () => state;
  fake.getTotalTrackInfo = () => [];
  fake.getCurrentStreamInfo = () => { throw new Error('private URL'); };
  fake.setSelectTrack = () => { throw new Error('private URL'); };
  adapter.prepare('test', () => {});
  assert.equal(adapter.getTracks().error, 'unavailable');
  state = 'PAUSED';
  assert.equal(adapter.selectTrack('AUDIO', 1).error, 'unavailable');
  assert.equal(adapter.selectTrack('TEXT', 1).error, 'native-error');
  assert.equal(adapter.getCurrentTracks().error, 'native-error');
  state = 'PLAYING';
  adapter.seek(1);
  assert.equal(adapter.getTracks().error, 'unavailable');
  assert.equal(adapter.selectTrack('AUDIO', 1).error, 'unavailable');
  fake.seeks[0].ok();
  assert.equal(adapter.selectTrack('AUDIO', 1).error, 'native-error');
  adapter.stop();
  assert.equal(adapter.getTracks().error, 'unavailable');
});

test('Untertitelereignisse nur für Text und aktuelle Sitzung weitergeben', () => {
  const {fake, adapter} = setup();
  const seen = [];
  adapter.setSubtitleListener((duration, text) => seen.push([duration, text]));
  adapter.prepare('first', () => {});
  const old = fake.listeners[0];
  old.onsubtitlechange('1200', 'Hallo', '0');
  old.onsubtitlechange('1200', 'image', '1');
  adapter.prepare('second', () => {});
  old.onsubtitlechange('100', 'alt', '0');
  fake.listeners[1].onsubtitlechange(500, 'neu', 0);
  adapter.setSubtitleListener(null);
  fake.listeners[1].onsubtitlechange(500, 'ignoriert', '0');
  assert.deepEqual(seen, [['1200', 'Hallo'], [500, 'neu']]);
});
