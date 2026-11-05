(function (root) {
  'use strict';

  // One request has one owner; abort suppresses every later callback.
  function request(options, callback) {
    var xhr;
    var done = false;
    var failureTimer = null;
    var key;

    function finish(error, data) {
      if (done) { return; }
      done = true;
      if (failureTimer !== null) { root.clearTimeout(failureTimer); }
      if (xhr) { xhr.onreadystatechange = xhr.onerror = xhr.ontimeout = null; }
      callback(error, data);
    }

    function ready() {
      var data;
      if (xhr.readyState !== 4 || done) { return; }
      // Some implementations dispatch timeout/error after readyState 4 and status 0.
      if (xhr.status === 0) {
        failureTimer = root.setTimeout(function () { finish({ type: 'network' }); }, 0);
      } else if (xhr.status < 200 || xhr.status >= 300) {
        finish({ type: 'http', status: xhr.status });
      } else {
        try { data = options.responseText ? xhr.responseText : (options.emptyResponse && !xhr.responseText ? null : JSON.parse(xhr.responseText)); }
        catch (error) { finish({ type: 'parse' }); return; }
        finish(null, data);
      }
    }
    try {
      xhr = new XMLHttpRequest();
      xhr.onreadystatechange = ready;
      xhr.onerror = function () { finish({ type: 'network' }); };
      xhr.ontimeout = function () { finish({ type: 'timeout' }); };
      xhr.open(options.method || 'GET', options.url, true);
      xhr.timeout = options.timeout || 8000;
      for (key in (options.headers || {})) {
        if (Object.prototype.hasOwnProperty.call(options.headers, key)) { xhr.setRequestHeader(key, options.headers[key]); }
      }
      xhr.send(options.body || null);
    } catch (error) {
      // Defer so the caller can store the returned cancellation handle first.
      failureTimer = root.setTimeout(function () { finish({ type: 'open' }); }, 0);
    }
    return {
      abort: function () {
        if (done) { return; }
        done = true;
        if (failureTimer !== null) { root.clearTimeout(failureTimer); }
        if (xhr) {
          xhr.onreadystatechange = xhr.onerror = xhr.ontimeout = null;
          try { xhr.abort(); } catch (error) {}
        }
      }
    };
  }

  root.SMAIRYS_HTTP = { request: request };
}(window));
