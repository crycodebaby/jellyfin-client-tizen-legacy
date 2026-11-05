(function (root) {
  'use strict';

  // Adapter contract: prepare(source, callback), play(operationId),
  // pause(operationId), seek(seconds, operationId), stop(). The callback
  // reports ready, playing, paused, buffering, buffered, seeked, ended or error
  // using callback(type, operationId, bufferId).
  // playing, paused and seeked must carry the corresponding operationId.
  // buffering and buffered carry a matching, session-unique bufferId as the
  // third argument. The adapter serializes buffer cycles and never reuses IDs.
  // buffered completes a pending resume only with that resume's operationId.
  // load is rejected during listener dispatch; stop/dispose remain available.
  // The adapter owns any platform-specific resources.
  function createController(adapter) {
    var state = 'idle';
    var listeners = [];
    var revision = 0;
    var disposed = false;
    var beforeBuffering = 'playing';
    var beforeSeeking = 'playing';
    var expected = '';
    var nextOperationId = 0;
    var activeSeekId = null;
    var activeCommandId = null;
    var activeBufferId = null;
    var bufferingDuringSeek = false;
    var eventQueue = [];
    var dispatching = false;

    function transition(next, code) {
      var previous = state;
      var entry;
      var i;
      if (previous === next && !code) { return; }
      state = next;
      eventQueue.push({ event: { state: next, previous: previous, error: code || null }, listeners: listeners.slice(0) });
      if (dispatching) { return; }
      dispatching = true;
      try {
        while (eventQueue.length) {
          entry = eventQueue.shift();
          for (i = 0; i < entry.listeners.length; i += 1) {
            try { entry.listeners[i]({ state: entry.event.state, previous: entry.event.previous, error: entry.event.error }); } catch (ignore) {}
          }
        }
      } finally {
        dispatching = false;
      }
    }

    function fail(code) {
      // A failed operation no longer accepts events from that adapter session.
      revision += 1;
      expected = '';
      activeSeekId = null;
      activeCommandId = null;
      activeBufferId = null;
      bufferingDuringSeek = false;
      try { adapter.stop(); } catch (ignore) {}
      transition('error', code || 'player-error');
    }

    function eventFor(session, type, operationId, bufferId) {
      if (disposed || session !== revision) { return; }
      if (type === 'error' && state !== 'idle' && state !== 'stopped' && state !== 'error') { fail('player-error'); }
      else if (type === 'ready' && state === 'preparing' && !expected) {
        expected = 'playing';
        activeCommandId = ++nextOperationId;
        try { adapter.play(activeCommandId); } catch (error) { if (session === revision) { fail('play-failed'); } }
      } else if (type === 'playing' && expected === 'playing' && operationId === activeCommandId && (state === 'preparing' || state === 'paused' || state === 'buffering')) {
        expected = '';
        activeCommandId = null;
        activeBufferId = null;
        transition('playing');
      } else if (type === 'paused' && expected === 'paused' && operationId === activeCommandId && (state === 'playing' || state === 'buffering')) {
        expected = '';
        activeCommandId = null;
        activeBufferId = null;
        transition('paused');
      } else if (type === 'buffering' && ((typeof bufferId === 'string' && bufferId.length > 0) || (typeof bufferId === 'number' && isFinite(bufferId))) && (state === 'playing' || state === 'paused')) {
        activeBufferId = bufferId;
        beforeBuffering = state;
        transition('buffering');
      } else if (type === 'buffering' && ((typeof bufferId === 'string' && bufferId.length > 0) || (typeof bufferId === 'number' && isFinite(bufferId))) && state === 'seeking' && activeBufferId === null) {
        activeBufferId = bufferId;
        bufferingDuringSeek = true;
      } else if (type === 'buffered' && activeBufferId !== null && bufferId === activeBufferId && state === 'buffering') {
        if (expected === 'playing' && operationId !== activeCommandId) { return; }
        activeBufferId = null;
        if (expected === 'playing') { expected = ''; activeCommandId = null; transition('playing'); }
        else { transition(beforeBuffering); }
      } else if (type === 'buffered' && activeBufferId !== null && bufferId === activeBufferId && state === 'seeking') {
        activeBufferId = null;
        bufferingDuringSeek = false;
      } else if (type === 'seeked' && state === 'seeking' && operationId === activeSeekId) {
        activeSeekId = null;
        if (bufferingDuringSeek) {
          bufferingDuringSeek = false;
          beforeBuffering = beforeSeeking;
          transition('buffering');
        } else { transition(beforeSeeking); }
      } else if (type === 'ended' && (state === 'preparing' || state === 'playing' || state === 'paused' || state === 'buffering' || state === 'seeking')) {
        revision += 1;
        expected = '';
        activeSeekId = null;
        activeCommandId = null;
        activeBufferId = null;
        bufferingDuringSeek = false;
        try { adapter.stop(); } catch (ignore) {}
        transition('stopped');
      }
    }

    function load(source) {
      var session;
      if (disposed || dispatching || typeof source !== 'string' || !source.replace(/^\s+|\s+$/g, '')) { return false; }
      revision += 1;
      expected = '';
      activeSeekId = null;
      activeCommandId = null;
      activeBufferId = null;
      bufferingDuringSeek = false;
      session = revision;
      try { adapter.stop(); } catch (error) { fail('stop-failed'); return false; }
      transition('preparing');
      // A subscriber may synchronously stop or dispose before preparation.
      if (disposed || session !== revision) { return false; }
      try { adapter.prepare(source, function (type, operationId, bufferId) { eventFor(session, type, operationId, bufferId); }); }
      catch (error) { if (session === revision) { fail('prepare-failed'); } return false; }
      return true;
    }

    function play() {
      var session = revision;
      if (disposed || state !== 'paused' || expected) { return false; }
      expected = 'playing';
      activeCommandId = ++nextOperationId;
      try { adapter.play(activeCommandId); return true; } catch (error) { if (session === revision) { fail('play-failed'); } return false; }
    }

    function pause() {
      var session = revision;
      if (disposed || state !== 'playing' || expected) { return false; }
      expected = 'paused';
      activeCommandId = ++nextOperationId;
      try { adapter.pause(activeCommandId); return true; } catch (error) { if (session === revision) { fail('pause-failed'); } return false; }
    }

    function seek(seconds) {
      var session = revision;
      if (disposed || expected || (state !== 'playing' && state !== 'paused') || typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) { return false; }
      beforeSeeking = state;
      bufferingDuringSeek = false;
      activeSeekId = ++nextOperationId;
      transition('seeking');
      if (disposed || session !== revision || state !== 'seeking') { return false; }
      try { adapter.seek(seconds, activeSeekId); return true; } catch (error) { if (session === revision) { fail('seek-failed'); } return false; }
    }

    function stop() {
      if (disposed || state === 'idle' || state === 'stopped') { return false; }
      revision += 1;
      expected = '';
      activeSeekId = null;
      activeCommandId = null;
      activeBufferId = null;
      bufferingDuringSeek = false;
      try { adapter.stop(); } catch (error) { transition('error', 'stop-failed'); return false; }
      transition('stopped');
      return true;
    }

    function subscribe(listener) {
      var active = true;
      if (disposed || typeof listener !== 'function') { throw new Error('invalid-listener'); }
      listeners.push(listener);
      return function () {
        var i;
        if (!active) { return; }
        active = false;
        for (i = 0; i < listeners.length; i += 1) { if (listeners[i] === listener) { listeners.splice(i, 1); break; } }
      };
    }

    function dispose() {
      if (disposed) { return; }
      disposed = true;
      revision += 1;
      expected = '';
      activeSeekId = null;
      activeCommandId = null;
      activeBufferId = null;
      bufferingDuringSeek = false;
      try { adapter.stop(); } catch (ignore) {}
      transition('stopped');
      listeners = [];
    }

    if (!adapter || typeof adapter.prepare !== 'function' || typeof adapter.play !== 'function' || typeof adapter.pause !== 'function' || typeof adapter.seek !== 'function' || typeof adapter.stop !== 'function') { throw new Error('invalid-adapter'); }
    return { load: load, play: play, pause: pause, seek: seek, stop: stop, dispose: dispose, subscribe: subscribe, getState: function () { return state; } };
  }

  // Manual fake: tests control completion and error timing without real media.
  function createFakePlayer() {
    var handler = null;
    var calls = [];
    var lastSeekId = null;
    return {
      prepare: function (source, callback) { calls.push('prepare'); handler = callback; },
      play: function (operationId) { calls.push('play'); if (handler) { handler('playing', operationId); } },
      pause: function (operationId) { calls.push('pause'); if (handler) { handler('paused', operationId); } },
      seek: function (seconds, operationId) { calls.push('seek'); lastSeekId = operationId; },
      stop: function () { calls.push('stop'); handler = null; },
      emit: function (event, operationId, bufferId) { if (handler) { handler(event, operationId, bufferId); } },
      getHandler: function () { return handler; },
      getLastSeekId: function () { return lastSeekId; },
      getCalls: function () { return calls.slice(0); }
    };
  }

  root.SMAIRYS_PLAYBACK = { createController: createController, createFakePlayer: createFakePlayer };
}(window));
