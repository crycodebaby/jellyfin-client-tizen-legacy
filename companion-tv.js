(function (root) {
  'use strict';

  // The phone receives only bounded media data; the Jellyfin session remains on the TV.
  function create(options) {
    var revision = 0, token = '', timer = null, poll = null, requests = [], allowed = Object.create(null), allowedOrder = [], active = false, pairing = false, paired = false, deviceName = '', pollFailures = 0;
    var client = options && options.client, base = options && options.base, transport = options && options.transport;
    function forget(handle) { var i; for (i = requests.length - 1; i >= 0; i -= 1) { if (requests[i] === handle) { requests.splice(i, 1); } } }
    function send(path, body, callback) {
      var handle, generation = revision, completed = false;
      var headers = { 'Content-Type': 'application/json' };
      if (token) { headers.Authorization = 'Bearer ' + token; }
      handle = transport.request({ method: 'POST', url: base + path, headers: headers, body: JSON.stringify(body) }, function (error, result) {
        completed = true; forget(handle);
        if (generation === revision && callback) { callback(error, result); }
      });
      if (!completed) { requests.push(handle); }
      return handle;
    }
    function validId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value); }
    function respond(payload) { if (active) { send('/api/tv/events', payload, function () {}); } }
    function record(items, kind) {
      var out = [], i, item, id, title;
      for (i = 0; i < items.length && i < 20; i += 1) {
        item = items[i] || {}; id = item.id; title = kind === 'person' ? item.name : item.title;
        if (!validId(id) || typeof title !== 'string' || !title || title.length > 200 || /[\x00-\x1f]/.test(title)) { continue; }
        if (kind === 'movie' && !allowed[id]) { if (allowedOrder.length >= 500) { delete allowed[allowedOrder.shift()]; } allowed[id] = true; allowedOrder.push(id); }
        var row = { id: id, title: title, kind: kind };
        if (typeof item.imageUrl === 'string' && typeof options.mediaBase === 'string' && item.imageUrl.indexOf(options.mediaBase.replace(/\/+$/, '') + '/Items/' + encodeURIComponent(id) + '/Images/Primary?') === 0 && !/(?:api_?key|token)=/i.test(item.imageUrl)) { row.imageUrl = item.imageUrl; }
        out.push(row);
      }
      return out;
    }
    function handleEvent(event) {
      var start, limit, cb, h, kind, generation = revision, completed = false;
      if (!event || !validId(event.id) || !active) { return; }
      start = typeof event.start === 'number' && event.start >= 0 && event.start <= 10000 && event.start % 1 === 0 ? event.start : 0;
      limit = typeof event.limit === 'number' && event.limit >= 1 && event.limit <= 20 && event.limit % 1 === 0 ? event.limit : 20;
      if (event.type === 'play') {
        if (!validId(event.itemId) || !allowed[event.itemId] || typeof options.onPlay !== 'function') { respond({ type:'play-result', id:event.id, ok:false }); return; }
        try { options.onPlay(event.itemId, function (ok) { if (generation === revision) { respond({ type:'play-result', id:event.id, ok:ok === true }); } }); }
        catch (ignore) { respond({ type:'play-result', id:event.id, ok:false }); }
        return;
      }
      if (event.type !== 'browse' && event.type !== 'person') { return; }
      kind = event.type === 'browse' && event.kind === 'people' ? 'person' : 'movie';
      cb = function (error, data) {
        completed = true; forget(h);
        if (!active || generation !== revision) { return; }
        respond({ type: event.type === 'person' ? 'person-result' : 'browse-result', id:event.id,
          items: !error && data && Array.isArray(data.items) ? record(data.items, kind) : [],
          total: !error && data && typeof data.total === 'number' && isFinite(data.total) && data.total >= 0 && data.total <= 1000000 ? Math.floor(data.total) : 0,
          error: !!error });
      };
      if (event.type === 'person') {
        if (!validId(event.personId)) { cb({type:'invalid'}); return; }
        h = client.actorMovies(event.personId, start, limit, cb);
      } else if (event.kind === 'people' && typeof event.query === 'string' && event.query.length <= 100 && event.query.replace(/\s/g, '')) {
        h = client.searchPeople(event.query, start, limit, cb);
      } else if (event.kind === 'movies' && typeof event.query === 'string' && event.query.length <= 100) {
        h = event.query.replace(/\s/g, '') ? client.searchMovies(event.query, start, limit, cb) : client.movies(start, limit, cb);
      } else { cb({type:'invalid'}); return; }
      if (!completed && h && typeof h.abort === 'function') { requests.push(h); }
    }
    function next() {
      var generation = revision;
      if (!active) { return; }
      poll = transport.request({ url:base + '/api/tv/events', headers:{ Authorization:'Bearer ' + token } }, function (error, data) {
        var i;
        poll = null;
        if (!active || revision !== generation) { return; }
        if (error || !data || !Array.isArray(data.events)) {
          // A brief WLAN interruption should not immediately destroy an otherwise valid pairing.
          if (error && (error.type === 'network' || error.type === 'timeout' || (error.type === 'http' && (error.status === 502 || error.status === 503 || error.status === 504))) && pollFailures < 3) {
            pollFailures += 1; timer = root.setTimeout(next, 700 * Math.pow(2, pollFailures - 1)); return;
          }
          if (typeof options.onError === 'function') { options.onError(); } close(); return;
        }
        pollFailures = 0;
        if (data.paired === true) {
          var name = typeof data.deviceName === 'string' && data.deviceName.length <= 40 && !/[\x00-\x1f]/.test(data.deviceName) && data.deviceName.replace(/\s/g, '') ? data.deviceName : 'Handy';
          if (!paired || name !== deviceName) { paired = true; deviceName = name; if (typeof options.onConnected === 'function') { options.onConnected(name); } }
        }
        for (i = 0; i < data.events.length && i < 50; i += 1) { handleEvent(data.events[i]); }
        timer = root.setTimeout(next, 900);
      });
    }
    function pair(callback) {
      if (active || pairing || !client || typeof client.isAuthenticated !== 'function' || !client.isAuthenticated() || !transport || typeof transport.request !== 'function' || typeof base !== 'string' || !/^https?:\/\/[a-zA-Z0-9.:[\]-]+(?:\/[a-zA-Z0-9_/-]*)?$/.test(base)) { callback({type:'unavailable'}); return; }
      revision += 1; pairing = true;
      send('/api/pair', {}, function (error, data) {
        pairing = false;
        if (error || !data || !/^[A-Za-z0-9_-]{43}$/.test(data.tvToken || '') || !/^[A-Za-z0-9_-]{43}$/.test(data.pairToken || '')) { callback(error || {type:'invalid'}); return; }
        token = data.tvToken; active = true; callback(null, { pairToken:data.pairToken, expiresIn:data.expiresIn }); next();
      });
    }
    function adopt(tvToken) {
      if (active || pairing || !client || !client.isAuthenticated() || !transport || !/^[A-Za-z0-9_-]{43}$/.test(tvToken || '') || !/^https?:\/\/[a-zA-Z0-9.:[\]-]+(?:\/[a-zA-Z0-9_/-]*)?$/.test(base)) { return false; }
      revision += 1; token = tvToken; active = true; next(); return true;
    }
    function qr(callback) {
      var generation = revision, handle;
      if (!active || !token) { callback({type:'unavailable'}); return; }
      handle = transport.request({ url:base + '/api/tv/qr', headers:{Authorization:'Bearer ' + token} }, function (error, data) {
        forget(handle);
        if (generation !== revision) { return; }
        if (error || !data || typeof data.svg !== 'string' || data.svg.length > 262144 || !/^<svg[\s>]/.test(data.svg)) { callback(error || {type:'invalid'}); return; }
        callback(null, data.svg);
      });
      requests.push(handle);
    }
    function close() {
      var i, old = token;
      active = false; pairing = false; paired = false; deviceName = ''; pollFailures = 0; revision += 1; token = ''; allowed = Object.create(null); allowedOrder = [];
      if (timer !== null) { root.clearTimeout(timer); timer = null; }
      if (poll && typeof poll.abort === 'function') { poll.abort(); } poll = null;
      for (i = 0; i < requests.length; i += 1) { if (requests[i] && typeof requests[i].abort === 'function') { requests[i].abort(); } } requests = [];
      if (old) { transport.request({method:'POST',url:base + '/api/tv/close',headers:{Authorization:'Bearer ' + old,'Content-Type':'application/json'},body:'{}'}, function () {}); }
    }
    return { pair:pair, adopt:adopt, qr:qr, close:close, isActive:function () { return active; } };
  }
  root.SMAIRYS_PHONE = { create:create };
}(window));
