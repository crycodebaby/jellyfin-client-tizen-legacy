(function (root) {
  'use strict';

  // Bridges Samsung's asynchronous AVPlay callbacks to playback.js. A new
  // generation invalidates callbacks from a previous open/seek immediately.
  function create(avplay) {
    var generation = 0;
    var handler = null;
    var opened = false;
    var activeBuffer = null;
    var nextBuffer = 0;
    var seekRevision = 0;
    var lastPosition = 0;
    var seekPending = false;
    var closePending = false;
    var subtitleListener = null;

    if (!avplay || typeof avplay.open !== 'function' || typeof avplay.close !== 'function' ||
        typeof avplay.setListener !== 'function' || typeof avplay.setDisplayRect !== 'function' ||
        typeof avplay.prepareAsync !== 'function' || typeof avplay.play !== 'function' ||
        typeof avplay.pause !== 'function' || typeof avplay.seekTo !== 'function' ||
        typeof avplay.stop !== 'function') { throw new Error('avplay-unavailable'); }

    function closePlayer() {
      if (!opened) { return; }
      try { avplay.stop(); } catch (ignore) {}
      avplay.close();
      opened = false;
      closePending = false;
    }

    function stop() {
      generation += 1;
      handler = null;
      activeBuffer = null;
      seekRevision += 1;
      if (seekPending) { closePending = true; return; }
      closePlayer();
    }

    function prepare(source, callback) {
      var session;
      var pending = true;
      if (seekPending) { throw new Error('seek-pending'); }
      if (opened) { stop(); }
      session = ++generation;
      handler = callback;
      activeBuffer = null;
      lastPosition = 0;
      avplay.open(source);
      opened = true;
      avplay.setListener({
        onbufferingstart: function () {
          if (session !== generation || !handler || activeBuffer !== null) { return; }
          activeBuffer = ++nextBuffer;
          handler('buffering', null, activeBuffer);
        },
        onbufferingcomplete: function () {
          var current;
          if (session !== generation || !handler || activeBuffer === null) { return; }
          current = activeBuffer;
          activeBuffer = null;
          handler('buffered', null, current);
        },
        onstreamcompleted: function () {
          var current;
          if (session !== generation || !handler) { return; }
          if (!seekPending) {
            current = readTime('getCurrentTime');
            if (current !== null) { lastPosition = current; }
          }
          if (session === generation && handler) { handler('ended'); }
        },
        oncurrentplaytime: function (milliseconds) {
          if (session === generation && typeof milliseconds === 'number' && isFinite(milliseconds) && milliseconds >= 0) { lastPosition = milliseconds / 1000; }
        },
        onsubtitlechange: function (duration, text, data3, data4) {
          if (session === generation && handler && subtitleListener && (data3 === '0' || data3 === 0) && typeof text === 'string') {
            subtitleListener(duration, text);
          }
        },
        onerror: function () {
          if (session === generation && handler) { handler('error'); }
        }
      });
      avplay.setDisplayRect(0, 0, 1920, 1080);
      avplay.prepareAsync(function () {
        if (session === generation && handler && pending) { pending = false; handler('ready'); }
      }, function () {
        if (session === generation && handler && pending) { pending = false; handler('error'); }
      });
    }

    function play(operationId) {
      var session = generation;
      avplay.play();
      if (session === generation && handler) { handler('playing', operationId); }
    }

    function pause(operationId) {
      var session = generation;
      avplay.pause();
      if (session === generation && handler) { handler('paused', operationId); }
    }

    function seek(seconds, operationId) {
      var session = generation;
      var operation = ++seekRevision;
      var pending = true;
      if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0 || seconds > 2147483.647) { throw new Error('invalid-seek'); }
      seekPending = true;
      function complete(error) {
        if (!pending) { return; }
        pending = false; seekPending = false;
        if (closePending) { try { closePlayer(); } catch (ignore) {} return; }
        if (session === generation && handler && operation === seekRevision) { handler(error ? 'error' : 'seeked', operationId); }
      }
      try { avplay.seekTo(Math.floor(seconds * 1000), function () { complete(false); }, function () { complete(true); }); }
      catch (error) { seekPending = false; throw error; }
    }

    function readTime(method) {
      var value;
      if (!opened || typeof avplay[method] !== 'function') { return null; }
      try { value = avplay[method](); } catch (ignore) { return null; }
      return typeof value === 'number' && isFinite(value) && value >= 0 ? value / 1000 : null;
    }

    function trackState(method, type) {
      var state;
      if (!opened || seekPending || typeof avplay.getState !== 'function' || typeof avplay[method] !== 'function') { return false; }
      try { state = avplay.getState(); } catch (ignore) { return false; }
      return state === 'PLAYING' || (state === 'PAUSED' && (method !== 'setSelectTrack' || type === 'TEXT'));
    }

    function tracks(method) {
      var nativeTracks, result = [], info, entry, i;
      if (!trackState(method)) { return { ok: false, error: 'unavailable' }; }
      try {
        nativeTracks = avplay[method]();
        if (!nativeTracks || typeof nativeTracks.length !== 'number') { return { ok: false, error: 'invalid-response' }; }
        for (i = 0; i < nativeTracks.length; i += 1) {
          entry = nativeTracks[i];
          if (!entry || (entry.type !== 'AUDIO' && entry.type !== 'TEXT') || typeof entry.index !== 'number' || !isFinite(entry.index) || entry.index < 0 || Math.floor(entry.index) !== entry.index) { continue; }
          info = entry.extra_info;
          if (typeof info === 'string') { try { info = JSON.parse(info); } catch (ignore) { info = null; } }
          result.push({ type: entry.type, index: entry.index, language: info && typeof info === 'object' ? (typeof info.language === 'string' && info.language ? info.language : (typeof info.track_lang === 'string' ? info.track_lang : '')) : '' });
        }
        return { ok: true, tracks: result };
      } catch (ignore) { return { ok: false, error: 'native-error' }; }
    }

    function selectTrack(type, index) {
      if ((type !== 'AUDIO' && type !== 'TEXT') || typeof index !== 'number' || !isFinite(index) || index < 0 || Math.floor(index) !== index) { return { ok: false, error: 'invalid-track' }; }
      if (!trackState('setSelectTrack', type)) { return { ok: false, error: 'unavailable' }; }
      try { avplay.setSelectTrack(type, index); return { ok: true }; }
      catch (ignore) { return { ok: false, error: 'native-error' }; }
    }

    return {
      prepare: prepare, play: play, pause: pause, seek: seek, stop: stop,
      getTracks: function () { return tracks('getTotalTrackInfo'); },
      getCurrentTracks: function () { return tracks('getCurrentStreamInfo'); },
      selectTrack: selectTrack,
      setSubtitleListener: function (callback) { subtitleListener = typeof callback === 'function' ? callback : null; },
      getPosition: function () { var current = readTime('getCurrentTime'); if (current !== null) { lastPosition = current; } return lastPosition; },
      getDuration: function () { return readTime('getDuration') || 0; }
    };
  }

  root.SMAIRYS_AVPLAY = { create: create };
}(window));
