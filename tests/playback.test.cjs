'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');

const source = fs.readFileSync(path.join(__dirname, '../playback.js'), 'utf8');
function setup() {
  const window = {};
  vm.runInNewContext(source, { window, isFinite });
  const fake = window.SMAIRYS_PLAYBACK.createFakePlayer();
  return { fake, controller: window.SMAIRYS_PLAYBACK.createController(fake) };
}

test('Playback-Grundlage ist ES5 und validiert die Adapter-Schnittstelle', () => {
  acorn.parse(source, { ecmaVersion: 5 });
  const window = {};
  vm.runInNewContext(source, { window, isFinite });
  assert.throws(() => window.SMAIRYS_PLAYBACK.createController({}));
});

test('Vorbereiten, Wiedergabe, Pause, Pufferung und Suche bilden definierte Zustände', () => {
  const { fake, controller } = setup();
  const states = [];
  const unsubscribe = controller.subscribe((e) => states.push(e.state));
  assert.equal(controller.getState(), 'idle');
  assert.equal(controller.load('example-source'), true);
  assert.equal(controller.getState(), 'preparing');
  fake.emit('ready');
  assert.equal(controller.getState(), 'playing');
  fake.emit('buffering', null, 'buffer-a');
  assert.equal(controller.getState(), 'buffering');
  fake.emit('buffered', null, 'buffer-a');
  assert.equal(controller.getState(), 'playing');
  assert.equal(controller.pause(), true);
  assert.equal(controller.getState(), 'paused');
  assert.equal(controller.seek(30), true);
  assert.equal(controller.getState(), 'seeking');
  fake.emit('seeked', fake.getLastSeekId());
  assert.equal(controller.getState(), 'paused');
  assert.equal(controller.play(), true);
  assert.equal(controller.stop(), true);
  unsubscribe(); unsubscribe();
  assert.equal(controller.getState(), 'stopped');
  assert.deepEqual(states, ['preparing', 'playing', 'buffering', 'playing', 'paused', 'seeking', 'paused', 'playing', 'stopped']);
});

test('Ungültige Operationen verändern weder Zustand noch Player', () => {
  const { fake, controller } = setup();
  assert.equal(controller.load('  '), false);
  assert.equal(controller.play(), false);
  assert.equal(controller.pause(), false);
  assert.equal(controller.seek(0), false);
  assert.equal(controller.stop(), false);
  assert.equal(fake.getCalls().length, 0);
  controller.load('test'); fake.emit('ready');
  for (const value of [-1, Infinity, NaN, '10']) assert.equal(controller.seek(value), false);
  assert.equal(controller.getState(), 'playing');
});

test('Nicht angeforderte und verspätete Play/Pause-Ereignisse ändern den Zustand nicht', () => {
  const { fake, controller } = setup();
  controller.load('test');
  fake.emit('playing');
  assert.equal(controller.getState(), 'preparing');
  fake.emit('ready');
  controller.pause();
  fake.emit('playing');
  assert.equal(controller.getState(), 'paused');
  controller.play();
  fake.emit('paused');
  assert.equal(controller.getState(), 'playing');
});

test('Stop, Ersatz und Entsorgung verwerfen verspätete Ereignisse', () => {
  const { fake, controller } = setup();
  controller.load('first');
  const old = fake.getHandler();
  controller.load('second');
  old('ready'); old('error');
  assert.equal(controller.getState(), 'preparing');
  const current = fake.getHandler();
  current('ready');
  assert.equal(controller.stop(), true);
  current('playing'); current('error');
  assert.equal(controller.getState(), 'stopped');
  controller.dispose(); controller.dispose();
  assert.equal(controller.load('third'), false);
  assert.equal(controller.getState(), 'stopped');
});

test('Playerfehler stoppen und entwerten ausstehende Ereignisse', () => {
  const { fake, controller } = setup();
  const events = [];
  controller.subscribe((event) => events.push(event));
  controller.load('test');
  const old = fake.getHandler();
  fake.emit('error');
  assert.equal(controller.getState(), 'error');
  assert.equal(events.at(-1).error, 'player-error');
  old('ready');
  assert.equal(controller.getState(), 'error');
  assert.equal(controller.load('retry'), true);
  fake.emit('ready');
  assert.equal(controller.getState(), 'playing');
  fake.emit('ended');
  assert.equal(controller.getState(), 'stopped');
});

test('Adapterfehler und reentrant abgebrochene Vorbereitung werden behandelt', () => {
  const { fake, controller } = setup();
  controller.subscribe((event) => { if (event.state === 'preparing') controller.stop(); });
  assert.equal(controller.load('test'), false);
  assert.equal(controller.getState(), 'stopped');
  assert.equal(fake.getCalls().includes('prepare'), false);
  const other = setup();
  other.fake.prepare = () => { throw new Error('private detail'); };
  assert.equal(other.controller.load('test'), false);
  assert.equal(other.controller.getState(), 'error');
});

test('Asynchrone Fortsetzung durch playing oder buffered beendet den ausstehenden Play-Befehl', () => {
  for (const completion of ['playing', 'buffered']) {
    const { fake, controller } = setup();
    controller.load('test'); fake.emit('ready'); controller.pause();
    let pending;
    fake.play = (id) => { pending = id; };
    assert.equal(controller.play(), true);
    assert.equal(controller.play(), false, 'Ein zweiter Start darf nicht parallel laufen');
    fake.emit('buffering', null, 'resume-buffer');
    assert.equal(controller.getState(), 'buffering');
    fake.emit(completion, pending, 'resume-buffer');
    assert.equal(controller.getState(), 'playing');
    assert.equal(controller.pause(), true, 'Ein abgeschlossener Start darf keinen Befehl blockieren');
    assert.equal(controller.getState(), 'paused');
  }
});

test('Play- und Pause-Bestätigungen sind an die jeweilige Operation gebunden', () => {
  const { fake, controller } = setup();
  let playId;
  let pauseId;
  fake.play = (id) => { playId = id; };
  fake.pause = (id) => { pauseId = id; };
  controller.load('test'); fake.emit('ready'); const firstPlay = playId;
  fake.emit('playing', firstPlay);
  controller.pause(); const firstPause = pauseId;
  fake.emit('paused', firstPause);
  controller.play(); const secondPlay = playId;
  fake.emit('playing', firstPlay);
  assert.equal(controller.getState(), 'paused');
  fake.emit('buffering', null, 'resume-buffer');
  fake.emit('buffered', firstPlay, 'resume-buffer');
  assert.equal(controller.getState(), 'buffering');
  fake.emit('buffered', secondPlay, 'resume-buffer');
  assert.equal(controller.getState(), 'playing');
  controller.pause(); const secondPause = pauseId;
  fake.emit('paused', firstPause);
  assert.equal(controller.getState(), 'playing');
  fake.emit('paused', secondPause);
  assert.equal(controller.getState(), 'paused');
});

test('Eine reentrante load-Anforderung wird abgelehnt, bevor ein Player gestartet wird', () => {
  const { fake, controller } = setup();
  const received = [];
  let result;
  controller.subscribe((event) => { if (event.state === 'playing') result = controller.load('nested'); });
  controller.subscribe((event) => received.push(event.state));
  controller.load('initial'); fake.emit('ready');
  assert.equal(result, false);
  assert.deepEqual(received, ['preparing', 'playing']);
  assert.equal(fake.getCalls().filter((call) => call === 'prepare').length, 1);
  assert.equal(controller.load('after-event'), true);
});

test('Benachrichtigungen bleiben bei reentranten Zustandsänderungen geordnet', () => {
  const { fake, controller } = setup();
  const calls = [];
  controller.subscribe((event) => { calls.push('A:' + event.state); if (event.state === 'playing') controller.pause(); });
  controller.subscribe((event) => calls.push('B:' + event.state));
  controller.load('test'); fake.emit('ready');
  assert.deepEqual(calls, ['A:preparing', 'B:preparing', 'A:playing', 'B:playing', 'A:paused', 'B:paused']);
  assert.equal(controller.getState(), 'paused');
});

test('Ein Listener kann das Ereignis anderer Listener nicht verändern', () => {
  const { controller } = setup();
  let received;
  controller.subscribe((event) => { event.state = 'modified'; });
  controller.subscribe((event) => { received = event.state; });
  controller.load('test');
  assert.equal(received, 'preparing');
});

test('Pufferung während Suche meldet kein vorzeitiges Playing', () => {
  const { fake, controller } = setup();
  controller.load('test'); fake.emit('ready');
  assert.equal(controller.seek(25), true);
  const id = fake.getLastSeekId();
  fake.emit('buffering', null, 'seek-buffer-1'); fake.emit('playing');
  assert.equal(controller.getState(), 'seeking');
  fake.emit('seeked', id);
  assert.equal(controller.getState(), 'buffering');
  fake.emit('buffered', null, 'seek-buffer-1');
  assert.equal(controller.getState(), 'playing');
  assert.equal(controller.seek(30), true);
  const id2 = fake.getLastSeekId();
  fake.emit('buffering', null, 'seek-buffer-2'); fake.emit('buffered', null, 'seek-buffer-2');
  assert.equal(controller.getState(), 'seeking');
  fake.emit('seeked', id2);
  assert.equal(controller.getState(), 'playing');
});

test('Alte Suchbestätigungen können eine spätere Suche nicht abschließen', () => {
  const { fake, controller } = setup();
  controller.load('test'); fake.emit('ready');
  controller.seek(1); const first = fake.getLastSeekId();
  fake.emit('seeked', first);
  controller.seek(2); const second = fake.getLastSeekId();
  assert.notEqual(first, second);
  fake.emit('seeked', first); fake.emit('seeked');
  assert.equal(controller.getState(), 'seeking');
  fake.emit('seeked', second);
  assert.equal(controller.getState(), 'playing');
});

test('Veraltete Pufferbestätigung beendet keinen neuen Puffer während einer Suche', () => {
  const { fake, controller } = setup();
  controller.load('test'); fake.emit('ready');
  fake.emit('buffering', null, 'A');
  fake.emit('buffered', null, 'A');
  assert.equal(controller.getState(), 'playing');
  controller.seek(20);
  const seek = fake.getLastSeekId();
  fake.emit('buffering', null, 'B');
  fake.emit('buffered', null, 'A');
  fake.emit('seeked', seek);
  assert.equal(controller.getState(), 'buffering');
  fake.emit('buffered', null, 'A');
  assert.equal(controller.getState(), 'buffering');
  fake.emit('buffered', null, 'B');
  assert.equal(controller.getState(), 'playing');
});

test('Pufferereignisse ohne passende Zykluskennung werden ignoriert', () => {
  const { fake, controller } = setup();
  controller.load('test'); fake.emit('ready');
  fake.emit('buffering');
  assert.equal(controller.getState(), 'playing');
  fake.emit('buffering', null, 'first');
  fake.emit('buffered');
  assert.equal(controller.getState(), 'buffering');
  fake.emit('buffered', null, 'first');
  assert.equal(controller.getState(), 'playing');
});

test('Ende beim Vorbereiten und Abbruch während Pufferung verwerfen späte Events', () => {
  const { fake, controller } = setup();
  controller.load('test'); const first = fake.getHandler();
  fake.emit('ended');
  assert.equal(controller.getState(), 'stopped');
  first('ready'); assert.equal(controller.getState(), 'stopped');
  controller.load('second'); fake.emit('ready'); fake.emit('buffering', null, 'last-buffer');
  const second = fake.getHandler();
  assert.equal(controller.stop(), true);
  second('buffered', null, 'last-buffer'); second('playing');
  assert.equal(controller.getState(), 'stopped');
});
