(function () {
  'use strict';
  var token = '', sequence = 0, pending = {}, mode = 'movies', person = null, pollTimer, closed = false, start = 0, total = 0, pageSize = 20, browseRevision = 0;
  var app = document.getElementById('app'), results = document.getElementById('results');
  var message = document.getElementById('message'), query = document.getElementById('query');
  var moviesTab = document.getElementById('movies-tab'), peopleTab = document.getElementById('people-tab');
  var title = document.getElementById('section-title'), back = document.getElementById('back');
  var connection = document.getElementById('connection'), more = document.getElementById('more');
  var retry = document.getElementById('retry'), retryAppend = false, pollFailures = 0, pollFailureStarted = 0;
  var deviceInput = document.getElementById('device-name'), deviceMessage = document.getElementById('device-message');
  var login = document.getElementById('login'), loginForm = document.getElementById('login-form');
  var loginUser = document.getElementById('login-user'), loginPassword = document.getElementById('login-password');
  var loginSubmit = document.getElementById('login-submit'), loginMessage = document.getElementById('login-message');
  var deviceName = /iPhone/i.test(navigator.userAgent) ? 'iPhone' : (/iPad/i.test(navigator.userAgent) ? 'iPad' : (/Android/i.test(navigator.userAgent) ? 'Android-Handy' : 'Handy'));
  deviceInput.value = deviceName;
  var pairToken = location.hash.slice(1);
  // Remove the single-use secret before the page makes any network request.
  history.replaceState(null, '', location.pathname);
  var sessionKey = 'smairys.connect.mobile';
  function forgetSession() { try { sessionStorage.removeItem(sessionKey); } catch (error) {} }
  function saveSession() { try { if (/^[A-Za-z0-9_-]{43}$/.test(token)) { sessionStorage.setItem(sessionKey, token); } } catch (error) {} }
  function savedSession() {
    var value = '';
    try { value = sessionStorage.getItem(sessionKey) || ''; } catch (error) {}
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) { forgetSession(); return ''; }
    return value;
  }
  function request(path, options) {
    var timeout, controller = typeof AbortController === 'function' ? new AbortController() : null;
    options = options || {};
    options.cache = 'no-store'; options.credentials = 'same-origin'; options.referrerPolicy = 'no-referrer';
    options.headers = options.headers || {};
    if (token) { options.headers.Authorization = 'Bearer ' + token; }
    if (controller) { options.signal = controller.signal; }
    return Promise.race([fetch(path, options), new Promise(function (resolve, reject) {
      timeout = setTimeout(function () { if (controller) { controller.abort(); } reject(new Error('request timed out')); }, path === '/api/mobile/login' ? 20000 : 8000);
    })]).then(function (response) {
      clearTimeout(timeout);
      if (!response.ok) { var error = new Error('request failed'); error.status = response.status; throw error; }
      return response.json();
    }, function (error) { clearTimeout(timeout); throw error; });
  }
  function fail() {
    closed = true; token = ''; clearTimeout(pollTimer);
    forgetSession();
    Object.keys(pending).forEach(function (id) { clearTimeout(pending[id].timer); }); pending = {};
    app.hidden = true; document.getElementById('welcome').hidden = true;
    login.hidden = true; loginPassword.value = '';
    document.getElementById('failure').hidden = false; connection.textContent = 'Nicht verbunden';
  }
  function send(event, callback) {
    var id = String(++sequence);
    event.id = id;
    pending[id] = { callback: callback, timer: setTimeout(function () {
      var entry = pending[id]; if (!entry) { return; }
      delete pending[id]; entry.callback(null);
    }, 15000) };
    request('/api/mobile/events', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(event)})
      .catch(function () { var entry = pending[id]; if (!entry) { return; } clearTimeout(entry.timer); delete pending[id]; entry.callback(null); });
  }
  function poll() {
    if (closed) { return; }
    request('/api/mobile/events').then(function (data) {
      if (!data || !Array.isArray(data.events)) { throw new Error('invalid response'); }
      pollFailures = 0; pollFailureStarted = 0; connection.textContent = 'Verbunden';
      data.events.forEach(function (event) {
        if (event && typeof event.id === 'string' && pending[event.id]) {
          var entry = pending[event.id]; clearTimeout(entry.timer); delete pending[event.id]; entry.callback(event);
        }
      });
      pollTimer = setTimeout(poll, 900);
    }).catch(function (error) { retryPoll(error, poll); });
  }
  function retryPoll(error, next) {
    if (closed) { return; }
    if (error && (error.status === 401 || error.status === 403)) { fail(); return; }
    if (!pollFailureStarted) { pollFailureStarted = Date.now(); }
    if (Date.now() - pollFailureStarted >= 15000) { fail(); return; }
    pollFailures += 1; connection.textContent = 'Verbindet …';
    pollTimer = setTimeout(next, Math.min(1000 * pollFailures, 3000));
  }
  function updateTabs() {
    moviesTab.classList.toggle('active', mode === 'movies'); peopleTab.classList.toggle('active', mode === 'people');
    moviesTab.setAttribute('aria-pressed', String(mode === 'movies')); peopleTab.setAttribute('aria-pressed', String(mode === 'people'));
    query.placeholder = mode === 'movies' ? 'Film suchen' : 'Schauspieler suchen';
  }
  function render(items, append) {
    if (!append) { results.textContent = ''; }
    if (!Array.isArray(items) || !items.length) { message.textContent = 'Keine Ergebnisse gefunden.'; return; }
    message.textContent = '';
    items.slice(0, pageSize).forEach(function (item) {
      if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || (item.kind !== 'movie' && item.kind !== 'person')) { return; }
      var card = document.createElement('article'), button = document.createElement('button');
      var poster = document.createElement('span'), fallback = document.createElement('span'), name = document.createElement('h3'), action = document.createElement('p');
      card.className = 'card'; button.type = 'button'; poster.className = 'poster'; fallback.className = 'poster-fallback';
      fallback.textContent = item.kind === 'movie' ? 'FILM' : 'SCHAUSPIELER'; poster.appendChild(fallback);
      if (typeof item.imageUrl === 'string' && item.imageUrl) { var image = document.createElement('img'); image.alt = ''; image.loading = 'lazy'; image.src = item.imageUrl; image.onerror = function () { image.remove(); }; poster.appendChild(image); }
      name.textContent = item.title; action.className = 'play'; action.textContent = item.kind === 'movie' ? 'Auf Fernseher abspielen' : 'Filme ansehen';
      button.appendChild(poster); button.appendChild(name); button.appendChild(action); card.appendChild(button); results.appendChild(card);
      button.addEventListener('click', function () {
        if (item.kind === 'person') { openPerson(item); return; }
        button.disabled = true; action.textContent = 'Wird gesendet …';
        send({type:'play', itemId:item.id}, function (event) {
          button.disabled = false; action.textContent = 'Auf Fernseher abspielen';
          message.textContent = event && event.type === 'play-result' && event.ok ? 'An den Fernseher gesendet.' : (event ? 'Film konnte nicht gestartet werden.' : 'Keine Antwort vom Fernseher.');
        });
      });
    });
    if (!results.children.length) { message.textContent = 'Keine Ergebnisse gefunden.'; }
  }
  function loadPage(append) {
    var revision = ++browseRevision, offset = append ? start + pageSize : 0;
    var event = person ? {type:'person', personId:person.id, start:offset, limit:pageSize} : {type:'browse', kind:mode, query:query.value.trim(), start:offset, limit:pageSize};
    more.hidden = true; retry.hidden = true; message.textContent = 'Wird geladen …';
    send(event, function (reply) {
      if (revision !== browseRevision) { return; }
      if (!reply || reply.error || (reply.type !== 'browse-result' && reply.type !== 'person-result') || !Array.isArray(reply.items)) { message.textContent = 'Suche fehlgeschlagen.'; retryAppend = append; retry.hidden = false; return; }
      start = offset; total = typeof reply.total === 'number' && isFinite(reply.total) ? reply.total : offset + reply.items.length;
      render(reply.items, append); more.hidden = start + reply.items.length >= total || !reply.items.length;
    });
  }
  function browse() {
    person = null; back.hidden = true; updateTabs(); results.textContent = ''; start = 0; total = 0; more.hidden = true;
    retry.hidden = true;
    title.textContent = mode === 'movies' ? 'Filme entdecken' : 'Schauspieler entdecken';
    if (mode === 'people' && !query.value.trim()) { browseRevision += 1; message.textContent = 'Schauspieler suchen'; return; }
    loadPage(false);
  }
  function openPerson(item) {
    person = item; back.hidden = false; title.textContent = item.title; results.textContent = ''; start = 0; total = 0;
    loadPage(false);
  }
  retry.addEventListener('click', function () { loadPage(retryAppend); });
  more.addEventListener('click', function () { loadPage(true); });
  document.getElementById('search-form').addEventListener('submit', function (event) { event.preventDefault(); browse(); });
  moviesTab.addEventListener('click', function () { mode = 'movies'; query.value = ''; browse(); });
  peopleTab.addEventListener('click', function () { mode = 'people'; query.value = ''; browse(); });
  back.addEventListener('click', browse);
  document.getElementById('device-form').addEventListener('submit', function (event) {
    event.preventDefault(); var name = deviceInput.value.trim();
    if (!name || name.length > 40 || /[\x00-\x1f]/.test(name)) { deviceMessage.textContent = 'Bitte einen kurzen Gerätenamen eingeben.'; return; }
    request('/api/mobile/name', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({deviceName:name})}).then(function () { deviceMessage.textContent = 'Name auf dem Fernseher aktualisiert.'; }).catch(function () { deviceMessage.textContent = 'Name konnte nicht gespeichert werden.'; });
  });
  function connected() {
    saveSession();
    loginPassword.value = ''; login.hidden = true; document.getElementById('welcome').hidden = false;
    connection.textContent = 'Verbunden'; app.hidden = false; poll(); browse();
  }
  function waitForTv() {
    if (closed) { return; }
    request('/api/mobile/login-status').then(function (data) {
      pollFailures = 0; pollFailureStarted = 0; connection.textContent = 'Anmeldung';
      if (data && data.ready === true) { connected(); return; }
      pollTimer = setTimeout(waitForTv, 900);
    }).catch(function (error) { retryPoll(error, waitForTv); });
  }
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (loginSubmit.disabled) { return; }
    var username = loginUser.value.trim(), password = loginPassword.value;
    if (!username || !password) { loginMessage.textContent = 'Bitte Zugangsdaten eingeben.'; return; }
    loginSubmit.disabled = true; loginMessage.textContent = 'Anmeldung läuft …';
    request('/api/mobile/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:username,password:password})})
      .then(function () {
        password = ''; loginPassword.value = ''; loginForm.hidden = true;
        loginMessage.textContent = 'Fernseher wird verbunden …'; waitForTv();
      }).catch(function (error) {
        password = ''; loginPassword.value = '';
        if (error && error.status === 429) { loginUser.disabled = true; loginPassword.disabled = true; loginMessage.textContent = 'Neuen QR-Code scannen.'; return; }
        loginSubmit.disabled = false; loginMessage.textContent = 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.';
      });
  });
  if (!pairToken) {
    token = savedSession();
    if (!token) { fail(); return; }
    function resume() {
      if (closed) { return; }
      request('/api/mobile/events').then(function (data) {
        if (!data || !Array.isArray(data.events)) { throw new Error('invalid response'); }
        connected();
      }).catch(function (error) { retryPoll(error, resume); });
    }
    resume(); return;
  }
  forgetSession();
  request('/api/claim', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({pairToken:pairToken,deviceName:deviceName})})
    .then(function (data) {
      pairToken = '';
      if (!data || typeof data.mobileToken !== 'string' || !data.mobileToken) { throw new Error('invalid claim'); }
      token = data.mobileToken;
      if (data.loginRequired === true) { document.getElementById('welcome').hidden = true; login.hidden = false; connection.textContent = 'Anmeldung'; }
      else { connected(); }
    }).catch(function () { pairToken = ''; fail(); });
}());
