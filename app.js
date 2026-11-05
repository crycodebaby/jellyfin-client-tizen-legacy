(function () {
  'use strict';

  var items = [
    { title: 'Fernes Licht', kind: 'Film', category: 'filme', art: 'horizon', description: 'Ein Beispiel für einen Film in deiner Mediathek.' },
    { title: 'Nachtlinie', kind: 'Film', category: 'filme', art: 'night', description: 'Ein Beispiel für einen Film in deiner Mediathek.' },
    { title: 'Die Weite', kind: 'Film', category: 'filme', art: 'tide', description: 'Ein Beispiel für einen Film in deiner Mediathek.' },
    { title: 'Neue Horizonte', kind: 'Serie', category: 'serien', art: 'orbit', description: 'Ein Beispiel für eine Serie in deiner Mediathek.' },
    { title: 'Spuren im Sand', kind: 'Film', category: 'filme', art: 'dunes', description: 'Ein Beispiel für einen Film in deiner Mediathek.' },
    { title: 'Zwischen Welten', kind: 'Sammlung', category: 'sammlungen', art: 'collection', description: 'Ein Beispiel für eine Sammlung in deiner Mediathek.' },
    { title: 'Darsteller A', kind: 'Person', category: 'personen', art: 'portrait', description: 'Eine Beispielperson für die spätere Entdeckung von Darstellern.' },
    { title: 'Darsteller A & B', kind: 'Duo', category: 'personen', art: 'duo', description: 'Ein Beispiel für zwei Darsteller und ihre gemeinsamen Filme.' }
  ];
  var pages = {
    filme: { title: 'Filme', description: 'Deine Filmwelt an einem Ort.', heading: 'Filme entdecken' },
    serien: { title: 'Serien', description: 'Geschichten, die weitergehen.', heading: 'Serien entdecken' },
    sammlungen: { title: 'Sammlungen', description: 'Filmreihen und besondere Geschichten.', heading: 'Deine Sammlungen' },
    entdecken: { title: 'Entdecken', description: 'Finde deinen nächsten Lieblingsfilm.', heading: 'Inspiration für dich' },
    suche: { title: 'Suche', description: 'Finde, wonach dir gerade ist.', heading: 'Ergebnisse' },
    merkliste: { title: 'Merkliste', description: 'Für später aufgehoben.', heading: 'Deine Auswahl' }
  };
  var page = 'start';
  var modal = '';
  var focused = null;
  var returnFocus = null;
  var activeItem = 0;
  var saved = {};
  var request = null;
  var requestVersion = 0;
  var requestStarted = 0;
  var orbitTimer = null;
  var pressed = null;
  var pageRevision = 0;
  var motionMode = 'reduced';
  var motionManual = false;
  var motionPreference = null;
  var motionPreferenceHandler = null;
  var jellyfin = null;
  var phoneBridge = null;
  var phoneDeviceName = '';
  var phoneMovie = null;
  var authRequest = null;
  var authRevision = 0;
  var quickTimer = null;
  var quickStarted = 0;
  var homeRevision = 0;
  var homeDirty = false;
  var homeRestore = null;
  var homeRefreshFocus = null;
  var homeRails = [{ id: 'resume', method: 'resumeMovies', start: 0, total: 0, items: [], request: null }, { id: 'latest', method: 'latestMovies', start: 0, total: 0, items: [], request: null }, { id: 'recent', method: 'recentlyPlayedMovies', start: 0, total: 0, items: [], request: null }];
  var movieRequest = null;
  var moviePreviewRequest = null;
  var detailRequest = null;
  var trailerRequest = null, trailerId = '', playerIsTrailer = false;
  var favoriteFilter = 'all';
  var genreItems = [], genreIndex = -1, genreRequest = null, genreRevision = 0, discoverSort = 'title';
  var selectedGenres = [], draftGenres = [];
  var favoriteRequest = null;
  var detailRevision = 0;
  var detailClock = null;
  var detailClockItem = null;
  var detailFavorite = false;
  var favoriteListDirty = false;
  var castItems = [];
  var castStart = 0;
  var peopleRequest = null;
  var peopleRevision = 0;
  var peopleTimer = null;
  var searchActorId = '';
  var actorSeriesTotal = null, actorMovieCount = null;
  var searchMode = 'movies';
  var seriesContext = null;
  var actorOrigin = null;
  var collectionId = '';
  var collectionName = '';
  var collectionActorId = '', collectionActorName = '', collectionActorRequest = null, collectionActorTimer = null, collectionActorRevision = 0;
  var actorBrowseStart = 0, actorBrowseTotal = 0;
  var suggestedCollection = null;
  var suggestedActor = null;
  var collectionOrigin = null;
  var collectionFocusPending = false;
  var castRestoreId = '';
  var peopleStart = 0;
  var peopleTotal = 0;
  var movieRevision = 0;
  var movieItems = [];
  var movieStart = 0;
  var movieTotal = 0;
  var moviePages = [];
  var moviePageSize = 20;
  var moviePageLifetime = 60000;
  var movieNeedsRefresh = false;
  var activeMovieId = null;
  var playerController = null;
  var playerAdapter = null;
  var playerRequest = null;
  var playerInfo = null;
  var playerRevision = 0;
  var playerTimer = null;
  var playerHideTimer = null;
  var playerStarted = false;
  var playerPosition = 0;
  var playerResumePending = false;
  var playerResumeTarget = 0;
  var playerResumeSeekStarted = false;
  var playerReportsSuppressed = false;
  var playerTrackMenu = '';
  var playerTrackChoices = [];
  var seekDirection = 1, seekRate = 0, seekRunTimer = null, seekWaitingSince = 0;
  var clipSelection = null, clipOriginalPosition = 0, clipRestorePending = false, clipSeekTimer = null, clipSeekPending = false, clipSeekDirty = false, clipRequest = null, clipListRevision = 0, playerIsClip = false;
  var clipJobTimer = null, clipJobRequest = null, clipJobItem = '', clipJobId = '', clipJobCount = 0, clipJobErrors = 0;
  var clipCreateRequest = null;
  var clipLastKey = 0, clipLastKeyTime = 0, clipKeyRepeats = 0;
  var playerLanguageApplied = false;
  var subtitleEnabled = false;
  var subtitleTimer = null;
  var subtitleCues = null;
  var subtitlePoll = null;
  var subtitleServerIndex = null;
  var playerReports = [];
  var playerReportInFlight = false;
  var playerReportRevision = 0;
  var diagnostics = window.SMAIRYS_DIAGNOSTICS || null;
  var homeView = document.getElementById('home-view');
  var sectionView = document.getElementById('section-view');
  var searchInput = document.getElementById('search-input');
  var serverInput = document.getElementById('server-url');
  var rememberedConnection = null;
  var restoreRequest = null;
  var restoreRevision = 0;
  var restoreTimer = null, restoreRetries = 0;
  var loginVisible = false, loginRevision = 0, loginRequest = null, loginQrRequest = null, loginTimer = null, loginClient = null;
  var viewportStableWidth = 0, viewportStableHeight = 0;
  var loginPairToken = '', loginPairBase = '';
  var loginBusy = false;
  var previewMode = /(?:^|[?&])preview=1(?:&|$)/.test(window.location.search);

  function initializeConnection() {
    var saved = null;
    var defaults = window.SMAIRYS_DEVICE_DEFAULTS || {};
    try { saved = JSON.parse(window.localStorage.getItem('smairys.connection') || 'null'); } catch (error) {}
    try {
      if (!saved || typeof saved.server !== 'string' || saved.server.length > 1024 || typeof saved.username !== 'string' || saved.username.length > 256) { saved = null; }
      if (saved) { saved = { server: window.SMAIRYS_JELLYFIN.normalizeAddress(saved.server), username: saved.username, password: typeof saved.password === 'string' && saved.password.length <= 1024 ? saved.password : '' }; }
    } catch (error) { saved = null; }
    if (!saved && typeof defaults.server === 'string' && defaults.server.length <= 1024) {
      try { saved = { server: window.SMAIRYS_JELLYFIN.normalizeAddress(defaults.server), username: typeof defaults.username === 'string' ? defaults.username : '', password: '' }; } catch (error) {}
    }
    if (saved) {
      rememberedConnection = saved;
      serverInput.value = saved.server;
      document.getElementById('auth-user').value = saved.username;
    }
  }

  function rememberConnection(server, username, password) {
    rememberedConnection = { server: server, username: username, password: password || '' };
    try { window.localStorage.setItem('smairys.connection', JSON.stringify(rememberedConnection)); } catch (error) {}
  }

  function clearStoredSession() {
    try { window.localStorage.removeItem('smairys.session'); return true; } catch (error) { return false; }
  }

  function storedProfiles() {
    try {
      var profiles = JSON.parse(window.localStorage.getItem('smairys.profiles') || '[]');
      return Array.isArray(profiles) ? profiles.filter(function (p) { return p && p.session && p.session.userId && typeof p.username === 'string'; }) : [];
    } catch (error) { return []; }
  }

  function writeProfiles(profiles) {
    window.localStorage.setItem('smairys.profiles', JSON.stringify(profiles));
  }

  function renderProfiles() {
    var actions = document.querySelector('.profile-actions');
    var rows = actions.querySelectorAll('.profile-row');
    var active = jellyfin && typeof jellyfin.exportSession === 'function' ? jellyfin.exportSession() : null;
    var server = serverInput.value.trim().replace(/\/+$/, '');
    var profiles = storedProfiles(), i, entry, button, avatar, label;
    for (i = 0; i < rows.length; i += 1) { actions.removeChild(rows[i]); }
    for (i = profiles.length - 1; i >= 0; i -= 1) {
      entry = profiles[i];
      if (entry.server !== server) { continue; }
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'action-button action-secondary profile-row';
      button.setAttribute('data-zone', 'connection');
      button.setAttribute('data-action', 'profile-switch');
      button.setAttribute('data-profile-id', entry.session.userId);
      avatar = document.createElement('span');
      avatar.className = 'profile-avatar';
      avatar.textContent = entry.username.charAt(0).toUpperCase() || '?';
      label = document.createElement('span');
      label.textContent = entry.username;
      button.appendChild(avatar);
      button.appendChild(label);
      if (active && active.userId === entry.session.userId) {
        var status = document.createElement('span');
        status.className = 'profile-active';
        status.textContent = '✓ Aktiv';
        button.appendChild(status);
        button.setAttribute('aria-current', 'true');
      }
      actions.insertBefore(button, actions.firstChild);
    }
  }

  var profileSwitchRequest = null;
  var profileSwitchRevision = 0;

  function cancelProfileSwitch() {
    profileSwitchRevision += 1;
    if (profileSwitchRequest) { profileSwitchRequest.abort(); profileSwitchRequest = null; }
  }

  function switchProfile(id) {
    if (profileSwitchRequest) { return; }
    var active = jellyfin && typeof jellyfin.exportSession === 'function' ? jellyfin.exportSession() : null;
    if (active && active.userId === id) { closeConnection(); return; }
    var server = serverInput.value.trim().replace(/\/+$/, '');
    var profile = storedProfiles().filter(function (p) { return p.server === server && p.session.userId === id; })[0];
    if (!profile) { return; }
    var candidate = window.SMAIRYS_JELLYFIN.create(server);
    var revision = ++profileSwitchRevision;
    setConnectionStatus('', 'Profil wird geprüft …');
    profileSwitchRequest = candidate.restoreSession(profile.session, function (error, user) {
      if (revision !== profileSwitchRevision || modal !== 'connection') { return; }
      profileSwitchRequest = null;
      if (error || !user) {
        setConnectionStatus('error', error && error.type === 'invalid-session' ? 'Profil erneut anmelden. Dein aktuelles Profil bleibt aktiv.' : 'Server nicht erreichbar. Erneut versuchen.');
        return;
      }
      // Persist before replacing the current session, so a storage failure is recoverable.
      try { window.localStorage.setItem('smairys.session', JSON.stringify(profile)); }
      catch (storageError) { setConnectionStatus('error', 'Profil konnte nicht gespeichert werden.'); return; }
      endSession(true);
      jellyfin = candidate;
      document.getElementById('auth-user').value = user.name || profile.username;
      rememberSession(server, user.name || profile.username);
      setConnectionStatus('ok', 'Angemeldet.');
      updateSessionUI();
      closeConnection();
      setPage('start');
    });
  }

  function rememberSession(server, username) {
    var session = jellyfin && typeof jellyfin.exportSession === 'function' ? jellyfin.exportSession() : null;
    if (!session) { return false; }
    try {
      var record = { server: server, username: username || '', session: session };
      window.localStorage.setItem('smairys.session', JSON.stringify(record));
      var profiles = storedProfiles().filter(function (p) { return p.server !== server || p.session.userId !== session.userId; });
      profiles.unshift(record);
      try { writeProfiles(profiles); } catch (ignore) {}
      return true;
    } catch (error) { return false; }
  }

  function cancelRestore() {
    restoreRevision += 1;
    if (restoreRequest) { restoreRequest.abort(); restoreRequest = null; }
    if (restoreTimer !== null) { window.clearTimeout(restoreTimer); restoreTimer = null; }
    restoreRetries = 0;
  }

  function restoreSavedSession() {
    var saved, client, revision;
    if (restoreRequest || isConnected()) { return false; }
    try {
      saved = JSON.parse(window.localStorage.getItem('smairys.session') || 'null');
      if (!saved || typeof saved.server !== 'string' || !saved.session || window.SMAIRYS_JELLYFIN.normalizeAddress(saved.server) !== serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, '')) { return false; }
      client = window.SMAIRYS_JELLYFIN.create(saved.server);
    } catch (error) { return false; }
    if (typeof client.restoreSession !== 'function') { return false; }
    revision = ++restoreRevision;
    setConnectionStatus('', 'Anmeldung wird geprüft …');
    restoreRequest = client.restoreSession(saved.session, function (error, user) {
      if (revision !== restoreRevision) { return; }
      restoreRequest = null;
      if (error || !user) {
        if (error && error.type === 'invalid-session') {
          clearStoredSession();
          try { writeProfiles(storedProfiles().filter(function (p) { return p.server !== saved.server || p.session.userId !== saved.session.userId; })); } catch (ignore) {}
          renderProfiles();
          setConnectionStatus('error', 'Bitte erneut anmelden.');
        }
        else { setConnectionStatus('error', 'Server nicht erreichbar. Bitte erneut versuchen.'); }
        if (loginVisible) {
          loginStatus(error && error.type === 'invalid-session' ? 'Bitte erneut anmelden.' : 'Server nicht erreichbar.');
          startLoginQuick();
          if ((!error || error.type !== 'invalid-session') && restoreRetries < 2) {
            restoreRetries += 1;
            restoreTimer = window.setTimeout(function () { restoreTimer = null; if (loginVisible && !loginBusy) { restoreSavedSession(); } }, 5000);
          }
        }
        return;
      }
      jellyfin = client;
      rememberSession(saved.server, user.name || saved.username);
      restoreRetries = 0;
      document.getElementById('auth-user').value = user.name || saved.username || '';
      updateSessionUI();
      setConnectionStatus('ok', 'Angemeldet.');
      if (!modal) { setPage('start'); }
      else if (modal === 'connection' && document.getElementById('profile-main').style.display !== 'none') { focusElement(document.querySelector('.profile-row[aria-current]') || document.getElementById('auth-open')); }
    });
    return true;
  }

  function loginStatus(message) { document.getElementById('login-status').textContent = message || ''; }

  function cancelLoginQuick() {
    loginRevision += 1;
    loginBusy = false;
    document.getElementById('login-user').readOnly = false;
    document.getElementById('login-password').readOnly = false;
    if (loginTimer !== null) { window.clearTimeout(loginTimer); loginTimer = null; }
    if (loginRequest) { loginRequest.abort(); loginRequest = null; }
    if (loginQrRequest) { loginQrRequest.abort(); loginQrRequest = null; }
    if (loginPairToken && loginPairBase) { window.SMAIRYS_HTTP.request({ method:'POST', url:loginPairBase + '/api/tv/close', headers:{Authorization:'Bearer ' + loginPairToken, 'Content-Type':'application/json'}, body:'{}' }, function () {}); }
    loginPairToken = ''; loginPairBase = '';
    if (loginClient && typeof loginClient.cancelQuickConnect === 'function') { loginClient.cancelQuickConnect(); }
    loginClient = null;
  }

  function hideLogin() {
    if (!loginVisible) { return; }
    loginVisible = false; cancelLoginQuick();
    document.getElementById('login-password').value = '';
    document.getElementById('login-view').style.display = 'none';
    if (modal === 'login') { modal = ''; }
  }

  function showLogin() {
    if (previewMode || isConnected()) { return; }
    loginVisible = true; modal = 'login';
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('login-user').value = rememberedConnection ? rememberedConnection.username : '';
    document.getElementById('login-password').value = rememberedConnection ? rememberedConnection.password : '';
    focusElement(document.getElementById('login-submit'));
  }

  function startLoginQuick() {
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, ''), match, revision, started;
    var qr = document.getElementById('login-qr'), qrStatus = document.getElementById('login-qr-status');
    if (loginBusy) { return; }
    if (focused === document.getElementById('login-qr-retry')) { focusElement(document.getElementById('login-user')); }
    cancelLoginQuick(); qr.removeAttribute('src'); qr.style.display = 'none';
    document.getElementById('login-code').textContent = '';
    document.getElementById('login-qr-retry').style.display = 'none';
    if (!loginVisible) { return; }
    try { loginClient = window.SMAIRYS_JELLYFIN.create(base); }
    catch (error) { qrStatus.textContent = 'Server einrichten'; return; }
    revision = loginRevision; started = new Date().getTime(); qrStatus.textContent = 'Wird vorbereitet …';
    function fail(message) { if (revision === loginRevision) { qrStatus.textContent = message; document.getElementById('login-qr-retry').style.display = 'inline-block'; } }
    function poll() {
      if (!loginVisible || revision !== loginRevision) { return; }
      if (new Date().getTime() - started > 120000) { startLoginQuick(); return; }
      loginRequest = loginClient.pollQuickConnect(function (error, result) {
        if (!loginVisible || revision !== loginRevision) { return; }
        loginRequest = null;
        if (error || !result) { cancelLoginQuick(); qr.removeAttribute('src'); qr.style.display = 'none'; document.getElementById('login-code').textContent = ''; qrStatus.textContent = 'Verbindung nicht verfügbar'; document.getElementById('login-qr-retry').style.display = 'inline-block'; return; }
        if (!result.authenticated) { loginTimer = window.setTimeout(poll, 1500); return; }
        loginStatus('Anmeldung läuft …');
        loginRequest = loginClient.finishQuickConnect(function (finishError, user) {
          if (!loginVisible || revision !== loginRevision) { return; }
          loginRequest = null;
          if (finishError || !user) { loginStatus('Anmeldung fehlgeschlagen.'); startLoginQuick(); return; }
          var pairToken = loginPairToken, pairBase = loginPairBase;
          loginPairToken = ''; loginPairBase = '';
          cancelRestore();
          jellyfin = loginClient; document.getElementById('auth-user').value = user.name || '';
          rememberSession(base, user.name || ''); rememberConnection(base, user.name || '', '');
          updateSessionUI(); setConnectionStatus('ok', 'Angemeldet.'); setPage('start');
          if (pairToken && pairBase) { connectAfterLogin(pairBase, pairToken); }
        });
      });
    }
    loginRequest = loginClient.beginQuickConnect(function (error, result) {
      if (!loginVisible || revision !== loginRevision) { return; }
      loginRequest = null;
      if (error || !result) { fail('Quick Connect nicht verfügbar'); return; }
      document.getElementById('login-code').textContent = result.code;
      match = /^https?:\/\/([^\/:?#]+|\[[^\]]+\])(?::\d+)?(?:\/|$)/i.exec(base);
      if (!match || !companionAddress(base)) { fail('QR-Code nicht verfügbar'); }
      else {
        loginQrRequest = window.SMAIRYS_HTTP.request({ method: 'POST', url: companionAddress(base) + '/api/tv/quick-connect-qr', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ server: base, code: result.code }) }, function (qrError, data) {
          if (!loginVisible || revision !== loginRevision) { return; }
          loginQrRequest = null;
          if (qrError || !data || typeof data.svg !== 'string' || !/^<svg[\s>]/.test(data.svg) || data.svg.length > 262144 || typeof data.tvToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.tvToken)) { fail('QR-Code nicht verfügbar'); return; }
          loginPairToken = data.tvToken; loginPairBase = companionAddress(base);
          qr.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data.svg);
          qr.style.display = 'block'; qrStatus.textContent = '';
          document.getElementById('login-code').textContent = '';
        });
      }
      loginTimer = window.setTimeout(poll, 1500);
    });
  }

  function submitLogin() {
    var user = document.getElementById('login-user'), password = document.getElementById('login-password');
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, ''), username = user.value, enteredPassword = password.value, revision;
    if (loginBusy) { return; }
    if (!username.replace(/^\s+|\s+$/g, '')) { loginStatus('Benutzername eingeben.'); focusElement(user); return; }
    cancelRestore(); cancelLoginQuick();
    try { loginClient = window.SMAIRYS_JELLYFIN.create(base); }
    catch (error) { password.value = ''; loginStatus('Serveradresse prüfen.'); return; }
    revision = loginRevision; loginBusy = true; user.readOnly = true; password.readOnly = true; loginStatus('Anmeldung läuft …');
    loginRequest = loginClient.login(username, enteredPassword, function (error, authenticatedUser) {
      if (!loginVisible || revision !== loginRevision) { return; }
      loginRequest = null; loginBusy = false; password.value = ''; user.readOnly = false; password.readOnly = false;
      if (error) { loginStatus(error.type === 'http' && (error.status === 401 || error.status === 403) ? 'Zugangsdaten prüfen.' : 'Verbindung prüfen.'); focusElement(user); startLoginQuick(); return; }
      jellyfin = loginClient; document.getElementById('auth-user').value = authenticatedUser && authenticatedUser.name ? authenticatedUser.name : username;
      rememberConnection(base, username, rememberSession(base, username) ? '' : enteredPassword);
      enteredPassword = ''; updateSessionUI(); setConnectionStatus('ok', 'Angemeldet.'); setPage('start');
    });
  }

  function saveLoginServer() {
    var input = document.getElementById('login-server-input'), base;
    try { base = window.SMAIRYS_JELLYFIN.normalizeAddress(input.value); }
    catch (error) { loginStatus('Serveradresse prüfen.'); focusElement(input); return; }
    cancelRestore(); serverInput.value = base; loginStatus('');
    document.getElementById('login-server-box').style.display = 'none';
    focusElement(document.getElementById('login-user')); startLoginQuick();
  }

  function fillSavedPassword() {
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
    var user = document.getElementById('auth-user').value;
    document.getElementById('auth-password').value = rememberedConnection && rememberedConnection.server === base && rememberedConnection.username === user ? rememberedConnection.password : '';
  }

  function forgetProfile() {
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
    var cleared = false;
    rememberedConnection = { server: base, username: '', password: '' };
    cancelRestore();
    try { window.localStorage.setItem('smairys.connection', JSON.stringify(rememberedConnection)); cleared = clearStoredSession(); writeProfiles(storedProfiles().filter(function (p) { return p.server !== base; })); renderProfiles(); } catch (error) { cleared = false; }
    document.getElementById('auth-user').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('profile-name').textContent = 'Melde dich bei deiner Mediathek an.';
    setConnectionStatus(cleared ? 'ok' : 'error', cleared ? 'Gespeicherte Anmeldung gelöscht.' : 'Anmeldung konnte nicht dauerhaft gelöscht werden.');
  }

  function applyBranding() {
    var branding = window.SMAIRYS_BRANDING || {};
    var name = typeof branding.appTitle === 'string' ? branding.appTitle : 'Smairys Mediathek';
    var slogan = typeof branding.slogan === 'string' ? branding.slogan : 'deine freie Kinoerfahrung';
    document.title = name;
    document.getElementById('brand-name-main').textContent = typeof branding.headerName === 'string' ? branding.headerName : 'SMAIRYS';
    document.getElementById('brand-name-sub').textContent = typeof branding.headerSubtitle === 'string' ? branding.headerSubtitle : 'MEDIATHEK';
    document.getElementById('login-brand-main').textContent = document.getElementById('brand-name-main').textContent;
    document.getElementById('login-brand-sub').textContent = document.getElementById('brand-name-sub').textContent;
    document.getElementById('brand-avatar').textContent = typeof branding.avatarInitial === 'string' ? branding.avatarInitial : 'S';
    document.querySelector('.brand').setAttribute('aria-label', name + (slogan ? ' – ' + slogan : ''));
  }

  function fitViewport() {
    var app = document.getElementById('app');
    var width = window.innerWidth || 1920;
    var height = window.innerHeight || 1080;
    var active = document.activeElement;
    var editing = active && active.tagName === 'INPUT';
    if (editing && viewportStableWidth && width === viewportStableWidth && height < viewportStableHeight * 0.8) { height = viewportStableHeight; }
    else if (!editing || !viewportStableHeight || height >= viewportStableHeight * 0.8) { viewportStableWidth = width; viewportStableHeight = height; }
    var scale = Math.min(width / 1920, height / 1080, 1);
    app.style.webkitTransformOrigin = '0 0';
    app.style.transformOrigin = '0 0';
    app.style.webkitTransform = 'scale(' + scale + ')';
    app.style.transform = 'scale(' + scale + ')';
  }

  function hasClass(element, name) {
    return (' ' + element.className + ' ').indexOf(' ' + name + ' ') !== -1;
  }

  function removeClass(element, name) {
    if (element) { element.className = (' ' + element.className + ' ').replace(' ' + name + ' ', ' ').replace(/^\s+|\s+$/g, ''); }
  }

  function addClass(element, name) {
    if (element && !hasClass(element, name)) { element.className += ' ' + name; }
  }

  function setMotion(mode, persist) {
    var app = document.getElementById('app');
    var choices = document.querySelectorAll('[data-action="motion"]');
    var i;
    if (mode !== 'full' && mode !== 'reduced' && mode !== 'off') { mode = 'reduced'; }
    motionMode = mode;
    removeClass(app, 'motion-full');
    removeClass(app, 'motion-reduced');
    removeClass(app, 'motion-off');
    addClass(app, 'motion-' + mode);
    for (i = 0; i < choices.length; i += 1) {
      choices[i].setAttribute('aria-pressed', choices[i].getAttribute('data-mode') === mode ? 'true' : 'false');
    }
    if (persist) {
      motionManual = true;
      try { window.localStorage.setItem('smairys.motion', mode); } catch (error) {}
    }
  }

  function initializeMotion() {
    var mode = null;
    var noPreference = null;
    var supported = false;
    try { mode = window.localStorage.getItem('smairys.motion'); } catch (error) {}
    motionManual = mode === 'full' || mode === 'reduced' || mode === 'off';
    try {
      if (typeof window.matchMedia === 'function') {
        motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
        noPreference = window.matchMedia('(prefers-reduced-motion: no-preference)');
        supported = !!((motionPreference && motionPreference.matches) || (noPreference && noPreference.matches));
      }
    } catch (error) { motionPreference = null; }
    if (!motionManual) {
      mode = supported && noPreference && noPreference.matches ? 'full' : 'reduced';
    }
    if (motionPreference && supported) {
      motionPreferenceHandler = function (event) { if (!motionManual) { setMotion(event.matches ? 'reduced' : 'full', false); } };
      try {
        if (typeof motionPreference.addEventListener === 'function') { motionPreference.addEventListener('change', motionPreferenceHandler); }
        else if (typeof motionPreference.addListener === 'function') { motionPreference.addListener(motionPreferenceHandler); }
      } catch (error) {}
    }
    setMotion(mode, false);
  }

  function animatePage(element) {
    var revision = ++pageRevision;
    var frame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
    removeClass(homeView, 'page-enter');
    removeClass(sectionView, 'page-enter');
    if (motionMode === 'off' || typeof frame !== 'function') { return; }
    frame.call(window, function () { if (revision === pageRevision && !modal && element.style.display !== 'none') { addClass(element, 'page-enter'); } });
  }

  function clearPressed() {
    removeClass(pressed, 'is-pressed');
    pressed = null;
  }

  function focusElement(element) {
    if (!element) { return; }
    if (focused !== element) { removeClass(focused, 'is-focused'); }
    focused = element;
    if (page === 'start') {
      var homeZone = element.getAttribute('data-zone') || '', homeOffset = 0, homeRail;
      if (homeZone.indexOf('home-') === 0) { homeRail = document.getElementById(homeZone); if (homeRail && homeRail.parentNode) { homeOffset = Math.max(0, homeRail.parentNode.offsetTop - 460); } }
      document.getElementById('home-library').style.webkitTransform = homeOffset ? 'translateY(-' + homeOffset + 'px)' : '';
      document.getElementById('home-library').style.transform = homeOffset ? 'translateY(-' + homeOffset + 'px)' : '';
    }
    addClass(element, 'is-focused');
    element.focus();
    // Hidden overflow can still be scrolled by focus, moving fixed TV dialogs off-screen.
    document.getElementById('app').scrollTop = 0;
    document.getElementById('app').scrollLeft = 0;
  }

  function nodesForZone(zone) {
    var elements = document.querySelectorAll('[data-zone="' + zone + '"]');
    var result = [];
    var i;
    for (i = 0; i < elements.length; i += 1) { if (isDisplayed(elements[i])) { result.push(elements[i]); } }
    return result;
  }

  function isDisplayed(element) {
    while (element && element !== document) {
      if (element.style && element.style.display === 'none') { return false; }
      element = element.parentNode;
    }
    return true;
  }

  function seriesEnabled() { return !!(window.SMAIRYS_DEVICE_DEFAULTS && window.SMAIRYS_DEVICE_DEFAULTS.enableSeries === true); }

  function isConnected() { return !!(jellyfin && jellyfin.isAuthenticated()); }
  function isMoviePage() { return page === 'filme' || page === 'entdecken' || page === 'sammlungen' || page === 'merkliste' || (page === 'suche' && !!searchActorId); }

  function requestMoviePage(start, limit, callback) {
    if ((page === 'filme' || page === 'entdecken' || (page === 'sammlungen' && collectionId)) && (selectedGenres.length || collectionActorId)) { return jellyfin.filterMovies(start, limit, callback, { parentId: page === 'sammlungen' ? collectionId : '', actorId: collectionActorId, genreIds: selectedGenres, filter: page === 'entdecken' ? favoriteFilter : 'all', sort: page === 'entdecken' ? discoverSort : 'title' }); }
    if (page === 'sammlungen') { return collectionId ? jellyfin.collectionMovies(collectionId, start, limit, callback) : jellyfin.collections(start, limit, callback); }
    if (page === 'merkliste') { return jellyfin.favorites(start, limit, callback, favoriteFilter); }
    if (page === 'entdecken') { return jellyfin.discoverMovies(start, limit, callback, favoriteFilter, genreIndex < 0 ? '' : genreItems[genreIndex].id, discoverSort); }
    if (page === 'suche' && searchActorId) { return jellyfin.actorMovies(searchActorId, start, limit, callback); }
    return jellyfin.movies(start, limit, callback);
  }

  function abortPeople() {
    peopleRevision += 1;
    if (peopleTimer !== null) { window.clearTimeout(peopleTimer); peopleTimer = null; }
    if (peopleRequest) { peopleRequest.abort(); peopleRequest = null; }
  }

  function sessionExpired() {
    if (modal === 'player') { stopPlayer(); }
    if (modal === 'detail') { closeDetail(); }
    else if (modal === 'connection') { closeConnection(); }
    endSession(); setPage('start');
    if (previewMode) { openConnection(); }
    else { showLogin(); loginStatus('Bitte erneut anmelden.'); startLoginQuick(); }
    setConnectionStatus('error', 'Die Sitzung ist abgelaufen. Bitte erneut anmelden.');
  }

  function indexOfNode(nodes, node) {
    var i;
    for (i = 0; i < nodes.length; i += 1) { if (nodes[i] === node) { return i; } }
    return -1;
  }

  function moveWithin(zone, direction) {
    var nodes = nodesForZone(zone);
    var index = indexOfNode(nodes, focused);
    if (index < 0) { index = 0; }
    index = Math.max(0, Math.min(nodes.length - 1, index + direction));
    focusElement(nodes[index]);
  }

  function currentNav() {
    return document.querySelector('[data-page="' + page + '"]');
  }

  function createCard(item, index, zone) {
    var card = document.createElement('button');
    var poster = document.createElement('span');
    var kind = document.createElement('span');
    var title = document.createElement('span');
    card.type = 'button';
    card.className = 'media-card';
    card.setAttribute('data-zone', zone || 'cards');
    card.setAttribute('data-action', 'detail');
    card.setAttribute('data-item', String(index));
    card.setAttribute('aria-label', item.title + (item.category === 'personen' ? ', Beispielperson' : ', Beispieltitel'));
    poster.className = 'poster art-' + item.art;
    kind.className = 'poster-kind';
    kind.textContent = item.kind.toUpperCase();
    title.className = 'card-title';
    title.textContent = item.title;
    if (item.kind !== 'Film') { poster.appendChild(kind); }
    card.appendChild(poster);
    card.appendChild(title);
    return card;
  }

  function renderCards(container, indexes, zone) {
    var started = diagnostics ? diagnostics.now() : 0;
    var i;
    while (container.firstChild) { container.removeChild(container.firstChild); }
    for (i = 0; i < indexes.length; i += 1) { container.appendChild(createCard(items[indexes[i]], indexes[i], zone)); }
    if (diagnostics) { diagnostics.record('cards-dom', diagnostics.now() - started, indexes.length); }
  }

  function appendReleaseYear(poster, year) {
    if (!year) { return; }
    var badge = document.createElement('span');
    badge.className = 'release-year';
    badge.textContent = String(year);
    poster.appendChild(badge);
  }

  function renderMovies(previewOnly, direction) {
    var container = document.getElementById('section-cards');
    var i;
    var card;
    var poster;
    var image;
    var title;
    var row;
    var preview;
    var previousPage = movieStart > 0 ? cachedMoviePage(movieStart - 5) : null;
    var previousItems = previousPage ? previousPage.items.slice(movieStart - 5 - previousPage.start, movieStart - previousPage.start) : [];
    var previous;
    var nextPage = cachedMoviePage(movieStart + 5);
    var nextItems = nextPage ? nextPage.items.slice(movieStart + 5 - nextPage.start, movieStart + 10 - nextPage.start) : [];
    var item;
    container.className = 'cards movie-grid';
    if (previewOnly) {
      previous = container.querySelector('.movie-row-previous');
      preview = container.querySelector('.movie-row-preview');
      if (!preview || !previous) { return; }
      while (previous.firstChild) { previous.removeChild(previous.firstChild); }
      while (preview.firstChild) { preview.removeChild(preview.firstChild); }
    } else {
      while (container.firstChild) { container.removeChild(container.firstChild); }
      previous = document.createElement('div'); previous.className = 'movie-row movie-row-previous'; previous.setAttribute('aria-hidden', 'true'); container.appendChild(previous);
      row = document.createElement('div'); row.className = 'movie-row movie-row-active' + (direction ? ' movie-enter-' + direction : ''); container.appendChild(row);
      preview = document.createElement('div'); preview.className = 'movie-row movie-row-preview'; preview.setAttribute('aria-hidden', 'true'); container.appendChild(preview);
    }
    for (i = 0; i < previousItems.length + movieItems.length + nextItems.length; i += 1) {
      if (previewOnly && i >= previousItems.length && i < previousItems.length + movieItems.length) { continue; }
      item = i < previousItems.length ? previousItems[i] : (i < previousItems.length + movieItems.length ? movieItems[i - previousItems.length] : nextItems[i - previousItems.length - movieItems.length]);
      card = document.createElement(i >= previousItems.length && i < previousItems.length + movieItems.length ? 'button' : 'span');
      card.type = 'button'; card.className = 'media-card';
      if (i >= previousItems.length && i < previousItems.length + movieItems.length) {
        card.setAttribute('data-zone', 'cards'); card.setAttribute('data-action', page === 'sammlungen' && !collectionId ? 'collection-open' : 'movie-detail');
        card.setAttribute('data-movie-id', item.id); card.setAttribute('aria-label', item.title);
      }
      poster = document.createElement('span'); poster.className = 'poster';
      if (item.imageUrl) {
        image = document.createElement('img'); image.alt = ''; image.src = item.imageUrl;
        image.onerror = function () { if (this.parentNode) { this.parentNode.removeChild(this); } };
        poster.appendChild(image);
      }
      if (item.isPlayed) { var playedMarker = document.createElement('span'); playedMarker.className = 'home-played'; playedMarker.textContent = 'Gesehen'; poster.appendChild(playedMarker); }
      else if (item.playedPercentage > 0) { var progressMarker = document.createElement('span'); progressMarker.className = 'home-progress'; progressMarker.style.width = Math.min(100, item.playedPercentage) + '%'; poster.appendChild(progressMarker); }
      title = document.createElement('span'); title.className = 'card-title'; title.textContent = item.title;
      appendReleaseYear(poster, item.year);
      card.appendChild(poster); card.appendChild(title); (i < previousItems.length ? previous : (i < previousItems.length + movieItems.length ? row : preview)).appendChild(card);
    }
  }

  function abortMovies() {
    movieRevision += 1;
    if (movieRequest) { movieRequest.abort(); movieRequest = null; }
    if (moviePreviewRequest) { moviePreviewRequest.abort(); moviePreviewRequest = null; }
  }

  function cachedMoviePage(start) {
    var now = new Date().getTime();
    var i;
    var entry;
    for (i = moviePages.length - 1; i >= 0; i -= 1) {
      entry = moviePages[i];
      if (now - entry.time >= moviePageLifetime || now < entry.time) { moviePages.splice(i, 1); }
      else if (start >= entry.start && start < entry.start + entry.items.length) {
        moviePages.splice(i, 1); moviePages.push(entry); return entry;
      }
    }
    return null;
  }

  function validMoviePage(result, requested) {
    var seen = {};
    var i;
    var j;
    var id;
    var old;
    if (!result || !result.items || result.start !== requested || typeof result.total !== 'number' || result.total < 0 || result.total % 1 || result.items.length !== Math.min(moviePageSize, Math.max(0, result.total - requested))) { return false; }
    for (i = 0; i < result.items.length; i += 1) {
      id = '$' + result.items[i].id;
      if (Object.prototype.hasOwnProperty.call(seen, id)) { return false; }
      seen[id] = true;
    }
    for (i = 0; i < moviePages.length; i += 1) {
      old = moviePages[i];
      if (old.total !== result.total || old.start === requested) { continue; }
      for (j = 0; j < old.items.length; j += 1) {
        id = '$' + old.items[j].id;
        if (Object.prototype.hasOwnProperty.call(seen, id)) { return false; }
      }
    }
    return true;
  }

  function loadMovies(start, selectLast, force) {
    var revision;
    var focusBefore = focused;
    var empty = document.getElementById('empty-state');
    var cached;
    var requestStart = Math.floor(start / moviePageSize) * moviePageSize;
    if (!isConnected() || movieRequest || (movieNeedsRefresh && !force)) { return; }
    if (moviePreviewRequest) { moviePreviewRequest.abort(); moviePreviewRequest = null; }
    revision = ++movieRevision;
    if (force) { moviePages = []; }
    cached = cachedMoviePage(start);
    function received(error, result) {
      var cards;
      var direction;
      if (revision !== movieRevision || !isMoviePage()) { return; }
      movieRequest = null;
      if (error) {
        if (error.type === 'unauthorized') {
          sessionExpired();
          return;
        }
        empty.style.display = 'block'; empty.textContent = 'Filme konnten nicht geladen werden. Erneut versuchen.';
        return;
      }
      if (!cached && (!validMoviePage(result, requestStart) || (start > 0 && start >= result.total) || (!force && movieItems.length && result.total !== movieTotal))) {
        moviePages = [];
        movieNeedsRefresh = true;
        empty.style.display = 'block'; empty.textContent = 'Die Filmliste hat sich geändert. Filme erneut öffnen.';
        return;
      }
      if ((modal && movieItems.length) || (focused !== focusBefore && focused && focused.getAttribute('data-zone') === 'cards')) {
        empty.style.display = movieNeedsRefresh ? 'block' : 'none';
        if (movieNeedsRefresh) { empty.textContent = 'Die Filmliste hat sich geändert. Filme erneut öffnen.'; }
        return;
      }
      if (!cached) {
        if (moviePages.length && moviePages[0].total !== result.total) { moviePages = []; }
        result.time = new Date().getTime();
        moviePages.push(result);
        if (moviePages.length > 2) { moviePages.shift(); }
      }
      movieNeedsRefresh = false;
      direction = movieItems.length && start !== movieStart ? (start > movieStart ? 'down' : 'up') : '';
      movieItems = result.items.slice(start - result.start, start - result.start + 5);
      movieStart = start; movieTotal = result.total;
      if (page === 'suche' && searchActorId) { actorMovieCount = result.total; updatePersonCount(); }
      renderMovies(false, direction);
      empty.style.display = movieItems.length ? 'none' : 'block';
      empty.textContent = 'Keine Filme gefunden.';
      cards = activeCards();
      if (collectionFocusPending && page === 'sammlungen' && collectionId) {
        collectionFocusPending = false;
        if (focused === currentNav() && cards.length) { focusElement(cards[0]); }
      }
      if (focusBefore && focused === focusBefore && focusBefore.getAttribute('data-zone') === 'cards') {
        focusElement(cards[Math.min(typeof selectLast === 'number' ? selectLast : (selectLast ? cards.length - 1 : 0), cards.length - 1)] || currentNav());
      }
      if ((movieStart > 0 && !cachedMoviePage(movieStart - 5)) || (movieStart + 5 < movieTotal && !cachedMoviePage(movieStart + 5))) {
        var previewIndex = movieStart > 0 && !cachedMoviePage(movieStart - 5) ? movieStart - 5 : movieStart + 5;
        var previewStart = Math.floor(previewIndex / moviePageSize) * moviePageSize;
        moviePreviewRequest = requestMoviePage(previewStart, moviePageSize, function (previewError, previewResult) {
          if (revision !== movieRevision || !isMoviePage()) { return; }
          moviePreviewRequest = null;
          if (previewError && previewError.type === 'unauthorized') { received(previewError); return; }
          if (previewError || !validMoviePage(previewResult, previewStart) || previewResult.total !== movieTotal) { return; }
          previewResult.time = new Date().getTime();
          moviePages.push(previewResult);
          if (moviePages.length > 2) { moviePages.shift(); }
          renderMovies(true);
        });
      }
    }
    if (cached) { received(null, cached); return; }
    empty.style.display = 'block'; empty.textContent = 'Filme werden geladen …';
    movieRequest = requestMoviePage(requestStart, moviePageSize, received);
  }

  function sectionIndexes() {
    var result = [];
    var query = searchInput.value.toLowerCase().replace(/^\s+|\s+$/g, '');
    var i;
    for (i = 0; i < items.length; i += 1) {
      if (items[i].category === 'personen' && page !== 'suche') { continue; }
      if ((page === 'filme' || page === 'serien' || page === 'sammlungen') && items[i].category !== page) { continue; }
      if (page === 'merkliste' && !saved[i]) { continue; }
      if (page === 'suche' && query && items[i].title.toLowerCase().indexOf(query) === -1) { continue; }
      result.push(i);
    }
    return result.slice(0, 5);
  }

  function searchPeople(start, selectLast) {
    var term = searchInput.value.replace(/^\s+|\s+$/g, '');
    var revision;
    var focusBefore = focused;
    var container = document.getElementById('section-cards');
    var empty = document.getElementById('empty-state');
    abortPeople();
    start = typeof start === 'number' ? start : 0;
    if (!start && !selectLast) { while (container.firstChild) { container.removeChild(container.firstChild); } }
    if (!term) { empty.textContent = ''; empty.style.display = 'none'; return; }
    if (!jellyfin || typeof jellyfin.searchPeople !== 'function') { empty.textContent = 'Suche nicht verfügbar.'; empty.style.display = 'block'; return; }
    empty.textContent = 'Suche läuft …'; empty.style.display = 'block';
    revision = peopleRevision;
    peopleTimer = window.setTimeout(function () {
      peopleTimer = null;
      peopleRequest = jellyfin[searchMode === 'people' ? 'searchPeople' : (searchMode === 'series' ? 'searchSeries' : 'searchMovies')](term, start, 5, function (error, result) {
        var i, item, card, poster, image, title;
        if (revision !== peopleRevision || page !== 'suche' || searchActorId) { return; }
        peopleRequest = null;
        if (error && error.type === 'unauthorized') { sessionExpired(); return; }
        if (error || !result) { empty.textContent = 'Suche fehlgeschlagen.'; return; }
        if ((start || selectLast) && focused !== focusBefore && focused && focused.getAttribute('data-zone') === 'cards') { empty.style.display = 'none'; return; }
        peopleStart = start; peopleTotal = result.total;
        if (searchMode === 'movies') { movieItems = result.items; }
        while (container.firstChild) { container.removeChild(container.firstChild); }
        empty.style.display = result.items.length ? 'none' : 'block';
        empty.textContent = searchMode === 'people' ? 'Keine Schauspieler gefunden.' : (searchMode === 'series' ? 'Keine Serien gefunden.' : 'Keine Filme gefunden.');
        for (i = 0; i < result.items.length; i += 1) {
          item = result.items[i]; card = document.createElement('button'); card.type = 'button'; card.className = 'media-card';
          card.setAttribute('data-zone', 'cards');
          if (searchMode === 'people') { card.setAttribute('data-action', 'actor-select'); card.setAttribute('data-actor-id', item.id); card.setAttribute('data-actor-name', item.name); }
          else if (searchMode === 'series') { card.setAttribute('data-action', 'series-open'); card.setAttribute('data-series-id', item.id); card.setAttribute('data-series-name', item.title); }
          else { card.setAttribute('data-action', 'movie-detail'); card.setAttribute('data-movie-id', item.id); }
          poster = document.createElement('span'); poster.className = 'poster';
          if (item.imageUrl) { image = document.createElement('img'); image.alt = ''; image.src = item.imageUrl; image.onerror = function () { this.style.display = 'none'; }; poster.appendChild(image); }
          title = document.createElement('span'); title.className = 'card-title'; title.textContent = searchMode === 'people' ? item.name : item.title;
          appendReleaseYear(poster, item.year);
          card.appendChild(poster); card.appendChild(title); container.appendChild(card);
        }
        if ((start || selectLast) && focused === focusBefore) { var cards = activeCards(); focusElement(cards[selectLast ? cards.length - 1 : 0] || searchInput); }
      });
    }, 300);
  }

  function loadSeriesChildren(start, selectLast) {
    var context = seriesContext, revision, focusBefore = focused;
    var container = document.getElementById('section-cards');
    var empty = document.getElementById('empty-state');
    if (!context || !jellyfin || typeof jellyfin.seriesChildren !== 'function') { return; }
    abortPeople(); revision = peopleRevision;
    empty.style.display = 'block'; empty.textContent = context.seasonId ? 'Episoden werden geladen …' : 'Staffeln werden geladen …';
    peopleRequest = jellyfin.seriesChildren(context.seasonId || context.seriesId, context.seasonId ? 'Episode' : 'Season', start, 5, function (error, result) {
      var i, item, card, poster, image, title, cards;
      if (revision !== peopleRevision || page !== 'suche' || context !== seriesContext) { return; }
      peopleRequest = null;
      if (error && error.type === 'unauthorized') { sessionExpired(); return; }
      if (error || !result) { empty.textContent = 'Liste konnte nicht geladen werden.'; return; }
      if (focused !== focusBefore && focused && focused.getAttribute('data-zone') === 'cards') { return; }
      peopleStart = start; peopleTotal = result.total;
      if (context.seasonId) { movieItems = result.items; }
      while (container.firstChild) { container.removeChild(container.firstChild); }
      empty.style.display = result.items.length ? 'none' : 'block';
      empty.textContent = context.seasonId ? 'Keine Episoden gefunden.' : 'Keine Staffeln gefunden.';
      for (i = 0; i < result.items.length; i += 1) {
        item = result.items[i]; card = document.createElement('button'); card.type = 'button'; card.className = 'media-card'; card.setAttribute('data-zone', 'cards');
        if (context.seasonId) { card.setAttribute('data-action', 'movie-detail'); card.setAttribute('data-movie-id', item.id); }
        else { card.setAttribute('data-action', 'season-open'); card.setAttribute('data-season-id', item.id); card.setAttribute('data-season-name', item.title); }
        poster = document.createElement('span'); poster.className = 'poster';
        if (item.imageUrl) { image = document.createElement('img'); image.alt = ''; image.src = item.imageUrl; image.onerror = function () { this.style.display = 'none'; }; poster.appendChild(image); }
        if (item.isPlayed) { var playedMarker = document.createElement('span'); playedMarker.className = 'home-played'; playedMarker.textContent = 'Gesehen'; poster.appendChild(playedMarker); }
        else if (item.playedPercentage > 0) { var progressMarker = document.createElement('span'); progressMarker.className = 'home-progress'; progressMarker.style.width = Math.min(100, item.playedPercentage) + '%'; poster.appendChild(progressMarker); }
        title = document.createElement('span'); title.className = 'card-title'; title.textContent = item.title;
        card.appendChild(poster); card.appendChild(title); container.appendChild(card);
      }
      if (focused === focusBefore && !modal) { cards = activeCards(); focusElement(cards[selectLast ? cards.length - 1 : 0] || document.getElementById('actor-back')); }
    });
  }

  function backSeries() {
    var context = seriesContext;
    if (!context) { return; }
    abortPeople();
    if (context.seasonId) { context.seasonId = ''; context.seasonName = ''; renderSection(); loadSeriesChildren(context.seasonStart || 0, false); }
    else { seriesContext = null; renderSection(); focusElement(searchInput); }
  }

  function openActor(id, name) {
    var searchCards = null;
    var cardNodes;
    var i;
    if (!id || !isConnected() || !jellyfin || typeof jellyfin.actorMovies !== 'function') { return; }
    if (modal === 'detail' && page === 'suche' && !searchActorId) {
      searchCards = []; cardNodes = document.getElementById('section-cards').children;
      for (i = 0; i < cardNodes.length; i += 1) { searchCards.push(cardNodes[i]); }
    }
    actorOrigin = modal === 'detail' ? { page: page, movieId: activeMovieId, actorId: id, actorFilter: searchActorId, items: movieItems, pages: moviePages, start: movieStart, total: movieTotal, collectionId: collectionId, collectionName: collectionName, collectionOrigin: collectionOrigin, searchTerm: searchInput.value, searchMode: searchMode, peopleStart: peopleStart, peopleTotal: peopleTotal, searchCards: searchCards, homeRail: page === 'start' && returnFocus ? returnFocus.getAttribute('data-zone') : '' } : (page === 'start' ? { page: 'start', homeTip: true } : null);
    if (modal === 'detail') { closeDetail(); }
    if (page !== 'suche') { setPage('suche'); }
    abortPeople(); abortMovies();
    searchActorId = id; moviePages = []; movieItems = []; movieStart = 0; movieTotal = 0; movieNeedsRefresh = false;
    actorSeriesTotal = null; actorMovieCount = null;
    searchInput.value = name || '';
    document.getElementById('person-name').textContent = name || '';
    document.getElementById('person-facts').textContent = '';
    document.getElementById('person-bio').textContent = '';
    document.getElementById('person-count').textContent = '';
    document.getElementById('person-image').style.backgroundImage = '';
    document.getElementById('person-line').textContent = 'Große Rollen. Noch größere Geschichten.';
    if (seriesEnabled() && typeof jellyfin.actorSeries === 'function') { jellyfin.actorSeries(id, 0, 1, function (error, result) { if (!error && result && page === 'suche' && searchActorId === id) { actorSeriesTotal = result.total; updatePersonCount(); } }); }
    if (typeof jellyfin.personDetails === 'function') {
      jellyfin.personDetails(id, function (error, person) {
        var birth, end, age, facts = [], viewer;
        if (page !== 'suche' || searchActorId !== id || error || !person) { return; }
        document.getElementById('person-name').textContent = person.name;
        if (person.imageUrl) { document.getElementById('person-image').style.backgroundImage = 'url("' + person.imageUrl.replace(/["\\\n\r]/g, '') + '"), url("assets/portrait.svg")'; }
        birth = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(person.born);
        end = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(person.died);
        if (birth) {
          facts.push('Geboren ' + birth[3] + '.' + birth[2] + '.' + birth[1]);
          var today = end ? new Date(Number(end[1]), Number(end[2]) - 1, Number(end[3])) : new Date();
          age = today.getFullYear() - Number(birth[1]) - (today.getMonth() + 1 < Number(birth[2]) || (today.getMonth() + 1 === Number(birth[2]) && today.getDate() < Number(birth[3])) ? 1 : 0);
          if (age >= 0 && age < 120) { facts.push(end ? '† mit ' + age + ' Jahren' : age + ' Jahre'); }
          if (!end && age >= 70 && age < 120) { viewer = document.getElementById('auth-user').value.replace(/^\s+|\s+$/g, '').substring(0, 32); document.getElementById('person-line').textContent = 'Eine Legende mit ordentlich Leinwandkilometern' + (viewer ? ', ' + viewer : '') + '.'; }
        }
        if (end) { facts.push('Gestorben ' + end[3] + '.' + end[2] + '.' + end[1]); }
        if (person.name.toLowerCase() === 'keanu reeves') { viewer = document.getElementById('auth-user').value.replace(/^\s+|\s+$/g, '').substring(0, 32); document.getElementById('person-line').textContent = 'Echsenmensch? Wir stellen nur Fragen' + (viewer ? ', ' + viewer : '') + '.'; }
        else if (person.name.toLowerCase() === 'robert de niro') { document.getElementById('person-line').textContent = 'You talkin’ to me? Ja, genau dich meinen wir.'; }
        if (person.birthplace && typeof person.birthplace === 'string') { facts.push(person.birthplace.substring(0, 55)); }
        document.getElementById('person-facts').textContent = facts.join('  ·  ');
        if (person.overview) { var bioText = person.overview.replace(/\s+/g, ' '), bioMatch = /^.{1,150}?[.!?](?:\s|$)/.exec(bioText), firstSentence = bioMatch ? bioMatch[0].replace(/\s+$/, '') : bioText; document.getElementById('person-bio').textContent = firstSentence.length <= 150 ? firstSentence : firstSentence.substring(0, 147).replace(/\s+\S*$/, '') + ' …'; }
      });
    }
    renderSection(); loadMovies(0, false, true);
  }

  function updatePersonCount() {
    document.getElementById('person-count').textContent = actorMovieCount === null ? '' : actorMovieCount + (actorMovieCount === 1 ? ' Film' : ' Filme') + (!seriesEnabled() || actorSeriesTotal === null ? '' : ' · ' + actorSeriesTotal + (actorSeriesTotal === 1 ? ' Serie' : ' Serien')) + ' in deiner Mediathek';
  }

  function backToPeople() {
    var origin = actorOrigin;
    var cards;
    var i;
    actorOrigin = null;
    if (origin) {
      if (origin.homeTip) { setPage('start'); focusElement(currentNav()); return; }
      if (origin.page === 'start') {
        homeRestore = origin;
        setPage('start');
        return;
      }
      setPage(origin.page); abortMovies();
      searchActorId = origin.actorFilter; movieItems = origin.items; moviePages = origin.pages; movieStart = origin.start; movieTotal = origin.total; movieNeedsRefresh = false;
      collectionId = origin.collectionId; collectionName = origin.collectionName; collectionOrigin = origin.collectionOrigin;
      searchInput.value = origin.searchTerm; searchMode = origin.searchMode; peopleStart = origin.peopleStart; peopleTotal = origin.peopleTotal;
      renderSection();
      if (origin.searchCards) {
        abortPeople();
        var container = document.getElementById('section-cards');
        while (container.firstChild) { container.removeChild(container.firstChild); }
        for (i = 0; i < origin.searchCards.length; i += 1) { container.appendChild(origin.searchCards[i]); }
        document.getElementById('empty-state').style.display = 'none';
      }
      cards = activeCards();
      for (i = 0; i < cards.length; i += 1) {
        if (cards[i].getAttribute('data-movie-id') === origin.movieId) {
          focusElement(cards[i]); castRestoreId = origin.actorId; openMovie(origin.movieId); return;
        }
      }
      focusElement(currentNav()); return;
    }
    abortMovies(); searchActorId = ''; moviePages = []; movieItems = [];
    renderSection(); focusElement(searchInput);
  }

  function cancelCollectionActorSearch() {
    collectionActorRevision += 1;
    if (collectionActorTimer !== null) { window.clearTimeout(collectionActorTimer); collectionActorTimer = null; }
    if (collectionActorRequest) { collectionActorRequest.abort(); collectionActorRequest = null; }
  }

  function closeCollectionActor() {
    cancelCollectionActorSearch();
    document.getElementById('collection-actor-modal').style.display = 'none';
    if (modal === 'collection-actor') { modal = ''; }
    focusElement(document.getElementById('collection-actor-filter'));
  }

  function searchCollectionActors() {
    var term = document.getElementById('collection-actor-search').value.replace(/^\s+|\s+$/g, '');
    var list = document.getElementById('collection-actor-results'), status = document.getElementById('collection-actor-status'), revision;
    cancelCollectionActorSearch(); list.textContent = '';
    if (term.length > 200) { status.textContent = 'Name ist zu lang'; return; }
    status.textContent = 'Suche …'; revision = collectionActorRevision;
    collectionActorTimer = window.setTimeout(function () {
      collectionActorTimer = null;
      if (modal !== 'collection-actor' || revision !== collectionActorRevision || !isConnected()) { return; }
      function received(error, data) {
        var i, button, person;
        if (modal !== 'collection-actor' || revision !== collectionActorRevision) { return; }
        collectionActorRequest = null;
        if (error && error.type === 'unauthorized') { closeCollectionActor(); sessionExpired(); return; }
        if (error || !data || !Array.isArray(data.items)) { status.textContent = 'Suche nicht verfügbar'; return; }
        actorBrowseTotal = data.total;
        document.getElementById('actor-prev').style.display = actorBrowseStart > 0 ? 'inline-block' : 'none';
        document.getElementById('actor-next').style.display = actorBrowseStart + data.items.length < actorBrowseTotal ? 'inline-block' : 'none';
        status.textContent = data.items.length ? (actorBrowseTotal > 6 ? (actorBrowseStart + 1) + '–' + (actorBrowseStart + data.items.length) + ' / ' + actorBrowseTotal : '') : 'Keine Schauspieler gefunden';
        for (i = 0; i < data.items.length; i += 1) {
          person = data.items[i]; button = document.createElement('button'); button.type = 'button';
          button.className = 'actor-choice'; button.setAttribute('data-zone', 'collection-actor'); button.setAttribute('data-action', 'collection-actor-select');
          button.setAttribute('data-actor-id', person.id); button.setAttribute('data-actor-name', person.name); button.setAttribute('aria-label', person.name);
          var portrait = document.createElement('span'), label = document.createElement('span');
          portrait.className = 'actor-choice-portrait'; if (person.imageUrl) { portrait.style.backgroundImage = 'url("' + person.imageUrl.replace(/["\\\n\r]/g, '') + '"), url("assets/portrait.svg")'; }
          label.className = 'actor-choice-name'; label.textContent = person.name; button.appendChild(portrait); button.appendChild(label); list.appendChild(button);
        }
        if (focused && (focused.id === 'actor-prev' || focused.id === 'actor-next' || focused.id === 'collection-actor-clear') && list.firstChild) { focusElement(list.firstChild); }
      }
      collectionActorRequest = term ? jellyfin.searchPeople(term, actorBrowseStart, 6, received) : jellyfin.browseActors(actorBrowseStart, 6, received);
    }, term ? 300 : 0);
  }

  function openCollectionActor() {
    if (!isConnected() || modal || (page !== 'filme' && page !== 'entdecken' && !(page === 'sammlungen' && collectionId))) { return; }
    modal = 'collection-actor'; document.getElementById('collection-actor-modal').style.display = 'block';
    document.getElementById('collection-actor-search').value = '';
    document.getElementById('collection-actor-results').textContent = '';
    document.getElementById('actor-prev').style.display = 'none'; document.getElementById('actor-next').style.display = 'none';
    actorBrowseStart = 0; actorBrowseTotal = 0; focusElement(document.getElementById('collection-actor-clear')); searchCollectionActors();
  }

  function applyCollectionActor(id, name) {
    collectionActorId = id || ''; collectionActorName = name || '';
    closeCollectionActor(); abortMovies(); movieItems = []; moviePages = []; movieStart = 0; movieTotal = 0; movieNeedsRefresh = false;
    renderSection(); focusElement(document.getElementById('collection-actor-filter')); loadMovies(0, false, true);
  }

  function renderGenreOptions() {
    var list = document.getElementById('genre-results'), i, button, selected;
    list.textContent = '';
    for (i = 0; i < genreItems.length; i += 1) {
      button = document.createElement('button'); selected = draftGenres.indexOf(genreItems[i].id) >= 0;
      button.type = 'button'; button.className = 'collection-actor-result' + (selected ? ' genre-selected' : '');
      button.setAttribute('data-zone', 'genre-modal'); button.setAttribute('data-action', 'genre-toggle'); button.setAttribute('data-genre-id', genreItems[i].id);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false'); button.textContent = (selected ? '[x]  ' : '[ ]  ') + genreItems[i].name; list.appendChild(button);
    }
  }
  function genreLabel() {
    var i;
    if (!selectedGenres.length) { return 'Alle Genres'; }
    if (selectedGenres.length === 1) { for (i = 0; i < genreItems.length; i += 1) { if (genreItems[i].id === selectedGenres[0]) { return genreItems[i].name; } } }
    return 'Genres: ' + selectedGenres.length;
  }
  function openGenreFilter() {
    if (!isConnected() || !genreItems.length || modal) { return; }
    draftGenres = selectedGenres.slice(); modal = 'genre-modal'; document.getElementById('genre-modal').style.display = 'block'; renderGenreOptions();
    focusElement(document.querySelector('#genre-results button') || document.getElementById('genre-apply'));
  }
  function closeGenreFilter() {
    document.getElementById('genre-modal').style.display = 'none'; if (modal === 'genre-modal') { modal = ''; }
    focusElement(document.getElementById('genre-filter'));
  }
  function refreshFilteredMovies(element) {
    abortMovies(); moviePages = []; movieItems = []; movieStart = 0; movieTotal = 0; movieNeedsRefresh = false;
    renderSection(); focusElement(element); loadMovies(0, false, true);
  }

  function openCollection(id) {
    var i;
    for (i = 0; i < movieItems.length; i += 1) {
      if (movieItems[i].id === id) {
        collectionOrigin = { id: id, items: movieItems, pages: moviePages, start: movieStart, total: movieTotal };
        collectionId = id; collectionName = movieItems[i].title; collectionActorId = ''; collectionActorName = '';
        abortMovies(); movieItems = []; moviePages = []; movieStart = 0; movieTotal = 0; movieNeedsRefresh = false;
        renderSection(); focusElement(currentNav()); collectionFocusPending = true; loadMovies(0, false, true); return;
      }
    }
  }

  function backToCollections() {
    var origin = collectionOrigin;
    var cards, i;
    abortMovies(); collectionId = ''; collectionName = ''; collectionActorId = ''; collectionActorName = ''; selectedGenres = []; collectionOrigin = null; collectionFocusPending = false;
    if (!origin) { setPage('sammlungen'); return; }
    movieItems = origin.items; moviePages = origin.pages; movieStart = origin.start; movieTotal = origin.total; movieNeedsRefresh = false;
    renderSection(); cards = activeCards();
    for (i = 0; i < cards.length; i += 1) {
      if (cards[i].getAttribute('data-movie-id') === origin.id) { focusElement(cards[i]); return; }
    }
    focusElement(currentNav());
  }

  function renderSection() {
    var data = pages[page];
    var indexes = sectionIndexes();
    var empty = document.getElementById('empty-state');
    document.getElementById('library-filters').style.display = 'block';
    document.getElementById('page-title').textContent = page === 'sammlungen' && collectionId ? collectionName : data.title;
    document.getElementById('actor-back').style.display = page === 'suche' && (searchActorId || seriesContext) ? 'inline-block' : 'none';
    document.getElementById('actor-back').textContent = seriesContext ? (seriesContext.seasonId ? 'Zurück zu Staffeln' : 'Zurück zur Suche') : 'Zurück zur Suche';
    document.getElementById('page-description').textContent = page === 'filme' ? '' : data.description;
    document.getElementById('section-title').textContent = page === 'filme' ? '' : data.heading;
    sectionView.className = isConnected() && isMoviePage() ? 'section-view is-movies' + (page === 'merkliste' || page === 'entdecken' || page === 'filme' || (page === 'sammlungen' && collectionId) ? ' has-filter' : '') : (page === 'entdecken' ? 'section-view is-discover' : 'section-view');
    document.getElementById('person-hero').style.display = page === 'suche' && searchActorId ? 'block' : 'none';
    if (page === 'suche' && searchActorId) { sectionView.className += ' is-person-page'; }
    document.getElementById('favorites-filter').style.display = isConnected() && (page === 'merkliste' || page === 'entdecken') ? 'inline-block' : 'none';
    document.getElementById('favorites-filter').textContent = favoriteFilter === 'unplayed' ? 'Nicht als gesehen markiert' : (favoriteFilter === 'played' ? 'Gesehen' : 'Alle Filme');
    document.getElementById('genre-filter').style.display = isConnected() && (page === 'filme' || page === 'entdecken' || (page === 'sammlungen' && collectionId)) && genreItems.length ? 'inline-block' : 'none';
    document.getElementById('genre-filter').textContent = genreLabel();
    document.getElementById('sort-filter').style.display = isConnected() && page === 'entdecken' ? 'inline-block' : 'none';
    document.getElementById('sort-filter').textContent = discoverSort === 'added' ? 'Zuletzt hinzugefügt' : (discoverSort === 'year' ? 'Erscheinungsdatum' : 'Titel A–Z');
    document.getElementById('collection-actor-filter').style.display = isConnected() && (page === 'filme' || page === 'entdecken' || (page === 'sammlungen' && collectionId)) ? 'inline-block' : 'none';
    document.getElementById('collection-actor-filter').textContent = 'Schauspieler: ' + (collectionActorName || 'Alle');
    document.getElementById('filter-reset').style.display = isConnected() && (page === 'filme' || page === 'entdecken' || (page === 'sammlungen' && collectionId)) && (selectedGenres.length || collectionActorId) ? 'inline-block' : 'none';
    document.getElementById('search-wrap').style.display = page === 'suche' ? 'block' : 'none';
    document.getElementById('search-mode').style.display = isConnected() && page === 'suche' && !searchActorId ? 'block' : 'none';
    document.getElementById('series-search').style.display = seriesEnabled() && isConnected() && page === 'suche' && !searchActorId && !seriesContext ? 'block' : 'none';
    document.getElementById('search-mode').textContent = searchMode === 'people' ? 'Schauspieler' : 'Filme';
    document.getElementById('series-search').setAttribute('aria-pressed', searchMode === 'series' ? 'true' : 'false');
    document.getElementById('people-section').style.display = page === 'entdecken' ? 'block' : 'none';
    if (isConnected()) {
      document.getElementById('search-wrap').style.display = page === 'suche' && !searchActorId && !seriesContext ? 'block' : 'none';
      document.getElementById('people-section').style.display = 'none';
      if (page === 'suche' && seriesContext) {
        document.getElementById('section-cards').className = 'cards';
        document.getElementById('section-title').textContent = seriesContext.seasonId ? seriesContext.seasonName : seriesContext.seriesName;
        document.getElementById('section-cards').setAttribute('aria-label', seriesContext.seasonId ? 'Episoden' : 'Staffeln');
        return;
      }
      if (isMoviePage()) {
        document.getElementById('section-cards').setAttribute('aria-label', 'Filme');
        renderMovies();
        empty.style.display = movieNeedsRefresh || !movieItems.length ? 'block' : 'none';
        empty.textContent = movieNeedsRefresh ? 'Die Filmliste hat sich geändert. Filme erneut öffnen.' : 'Keine Filme gefunden.';
      } else if (page === 'suche') {
        document.getElementById('section-cards').className = 'cards';
        searchInput.placeholder = searchMode === 'people' ? 'Schauspieler suchen' : (searchMode === 'series' ? 'Serien suchen' : 'Filme suchen');
        searchInput.setAttribute('aria-label', searchInput.placeholder);
        searchPeople();
      } else {
        document.getElementById('section-cards').className = 'cards';
        renderCards(document.getElementById('section-cards'), []);
        empty.style.display = 'block'; empty.textContent = 'Dieser Bereich ist noch nicht verfügbar.';
      }
      return;
    }
    document.getElementById('section-cards').className = 'cards';
    document.getElementById('section-cards').setAttribute('aria-label', 'Beispieltitel');
    renderCards(document.getElementById('section-cards'), indexes);
    if (page === 'entdecken') { renderCards(document.getElementById('people-cards'), [6, 7], 'people'); }
    empty.style.display = indexes.length ? 'none' : 'block';
    empty.textContent = page === 'merkliste' ? 'Noch keine Beispieltitel gemerkt.' : 'Keine Beispieltitel gefunden.';
  }

  function abortHome() {
    var i;
    homeRevision += 1;
    for (i = 0; i < homeRails.length; i += 1) {
      if (homeRails[i].request) { homeRails[i].request.abort(); homeRails[i].request = null; }
    }
  }

  function loadGenres() {
    var revision = ++genreRevision;
    if (genreRequest) { genreRequest.abort(); genreRequest = null; }
    genreItems = []; genreIndex = -1;
    if (!jellyfin || typeof jellyfin.genres !== 'function') { return; }
    genreRequest = jellyfin.genres(function (error, result) {
      if (revision !== genreRevision || (page !== 'filme' && page !== 'entdecken' && page !== 'sammlungen')) { return; }
      genreRequest = null;
      if (error && error.type === 'unauthorized') { sessionExpired(); return; }
      if (!error && result && result.items) {
        genreItems = result.items;
        document.getElementById('genre-filter').style.display = genreItems.length && (page === 'filme' || page === 'entdecken' || (page === 'sammlungen' && collectionId)) ? 'inline-block' : 'none';
        document.getElementById('genre-filter').textContent = genreLabel();
      }
    });
  }

  function homeCards(rail) {
    return document.getElementById('home-' + rail.id).querySelectorAll('[data-zone="home-' + rail.id + '"]');
  }

  function renderHomeRail(rail) {
    var container = document.getElementById('home-' + rail.id);
    var i, item, card, poster, image, title, marker;
    while (container.firstChild) { container.removeChild(container.firstChild); }
    for (i = 0; i < rail.items.length; i += 1) {
      item = rail.items[i]; card = document.createElement('button'); card.type = 'button'; card.className = 'media-card';
      card.setAttribute('data-zone', 'home-' + rail.id); card.setAttribute('data-action', 'movie-detail'); card.setAttribute('data-movie-id', item.id); card.setAttribute('aria-label', item.title);
      poster = document.createElement('span'); poster.className = 'poster';
      if (item.imageUrl) { image = document.createElement('img'); image.alt = ''; image.src = item.imageUrl; image.onerror = function () { if (this.parentNode) { this.parentNode.removeChild(this); } }; poster.appendChild(image); }
      if (rail.id === 'resume' && item.playedPercentage > 0) { marker = document.createElement('span'); marker.className = 'home-progress'; marker.style.width = Math.min(100, item.playedPercentage) + '%'; poster.appendChild(marker); }
      if (rail.id === 'recent' && item.isPlayed) { marker = document.createElement('span'); marker.className = 'home-played'; marker.textContent = 'Gesehen'; poster.appendChild(marker); }
      title = document.createElement('span'); title.className = 'card-title'; title.textContent = item.title; appendReleaseYear(poster, item.year); card.appendChild(poster); card.appendChild(title); container.appendChild(card);
    }
  }

  function loadHomeRail(rail, start, focusIndex) {
    var revision = homeRevision;
    var focusBefore = focused;
    var status = document.getElementById('home-' + rail.id + '-status');
    if (rail.request || !jellyfin || typeof jellyfin[rail.method] !== 'function') { return; }
    status.textContent = 'Filme werden geladen …';
    rail.request = jellyfin[rail.method](start, 5, function (error, result) {
      if (revision !== homeRevision) { return; }
      rail.request = null;
      if (error && error.type === 'unauthorized') { sessionExpired(); return; }
      if (error || !result || !result.items || typeof result.total !== 'number') { status.textContent = 'Filme konnten nicht geladen werden.'; return; }
      var liveCards = homeCards(rail);
      var liveIndex = indexOfNode(liveCards, focused);
      var liveId = liveIndex >= 0 ? focused.getAttribute('data-movie-id') : null;
      var liveElement = focused;
      rail.start = start; rail.total = result.total; rail.items = result.items; rail.loaded = true; renderHomeRail(rail);
      if (rail.id === 'resume') { document.getElementById('home-resume').parentNode.style.display = result.total === 0 ? 'none' : ''; }
      updateHomeGreeting();
      updateHomeCollection();
      if (rail.id === 'latest' && start === 0 && result.items.length && typeof jellyfin.movieDetails === 'function') {
        jellyfin.movieDetails(result.items[0].id, function (detailError, movie) {
          var button = document.getElementById('home-actor');
          if (revision !== homeRevision || page !== 'start' || detailError || !movie || !movie.people || !movie.people.length) { return; }
          suggestedActor = movie.people[0]; button.textContent = suggestedActor.name + ' entdecken';
          button.style.display = suggestedCollection ? 'none' : 'block';
        });
      }
      status.textContent = rail.items.length ? (rail.total > 5 ? (start + 1) + '–' + (start + rail.items.length) + ' / ' + rail.total : '') : (rail.id === 'resume' ? 'Keine begonnenen Filme.' : (rail.id === 'latest' ? 'Keine Filme gefunden.' : 'Noch keine Filme gesehen.'));
      if (liveId && focused === liveElement && !modal && page === 'start' && !(typeof focusIndex === 'number' && liveElement === focusBefore)) {
        var liveNew = homeCards(rail);
        var n;
        for (n = 0; n < liveNew.length; n += 1) { if (liveNew[n].getAttribute('data-movie-id') === liveId) { focusElement(liveNew[n]); break; } }
        if (n === liveNew.length) { focusElement(liveNew[Math.min(liveIndex, liveNew.length - 1)] || firstHomeCard()); }
      }
      if (homeRefreshFocus && homeRefreshFocus.rail === rail.id) {
        var focusSnapshot = homeRefreshFocus;
        var freshCards = homeCards(rail);
        var k;
        homeRefreshFocus = null;
        if (focused === focusSnapshot.element && !modal && page === 'start') {
          for (k = 0; k < freshCards.length; k += 1) { if (freshCards[k].getAttribute('data-movie-id') === focusSnapshot.id) { focusElement(freshCards[k]); break; } }
          if (k === freshCards.length) { focusElement(freshCards[Math.min(focusSnapshot.index, freshCards.length - 1)] || firstHomeCard()); }
        }
      }
      if (typeof focusIndex === 'number' && focused === focusBefore && !modal && page === 'start') { var cards = homeCards(rail); focusElement(cards[Math.min(focusIndex, cards.length - 1)] || currentNav()); }
      if (homeRestore && homeRestore.homeRail === 'home-' + rail.id && page === 'start' && !modal) {
        var restore = homeRestore;
        var restoreCards = homeCards(rail);
        var j;
        homeRestore = null;
        for (j = 0; j < restoreCards.length; j += 1) { if (restoreCards[j].getAttribute('data-movie-id') === restore.movieId) { focusElement(restoreCards[j]); castRestoreId = restore.actorId; openMovie(restore.movieId); return; } }
        focusElement(currentNav());
      }
    });
  }

  var bannerChoice = null;
  var bannerMemory = {};

  function loadHome() {
    var i;
    abortHome();
    document.getElementById('home-resume').parentNode.style.display = '';
    document.getElementById('home-collection').style.display = 'none'; document.getElementById('home-actor').style.display = 'none'; suggestedCollection = null; suggestedActor = null;
    bannerChoice = selectBanner(homeRails[1].start === 0 ? homeRails[1].items[0] : null);
    updateHomeGreeting();
    for (i = 0; i < homeRails.length; i += 1) { var start = homeRestore && homeRestore.homeRail === 'home-' + homeRails[i].id ? homeRails[i].start : 0; homeRails[i].items = []; homeRails[i].start = start; homeRails[i].total = 0; homeRails[i].loaded = false; renderHomeRail(homeRails[i]); loadHomeRail(homeRails[i], start); }
  }

  function collectionHistoryKey() {
    var session = jellyfin && jellyfin.exportSession ? jellyfin.exportSession() : null;
    return session && session.userId ? 'smairys.collection.' + encodeURIComponent(serverInput.value.replace(/\/+$/, '')) + '.' + encodeURIComponent(session.userId) : '';
  }
  function rememberPlayedCollection(movieId) {
    var key = collectionHistoryKey();
    if (!key || page !== 'sammlungen' || !collectionId || !collectionName || !movieId) { return; }
    try { window.localStorage.setItem(key, JSON.stringify({ id: collectionId, name: collectionName, movieId: movieId, time: new Date().getTime() })); } catch (ignore) {}
  }
  function updateHomeCollection() {
    var key = collectionHistoryKey(), entry, i, j, matches = false, now = new Date().getTime(), button = document.getElementById('home-collection');
    if (!key || page !== 'start') { return; }
    try { entry = JSON.parse(window.localStorage.getItem(key) || 'null'); } catch (ignore) { entry = null; }
    if (entry && typeof entry.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(entry.id) && typeof entry.name === 'string' && entry.name.length > 0 && entry.name.length <= 300 && typeof entry.movieId === 'string' && typeof entry.time === 'number' && now >= entry.time && now - entry.time < 30 * 86400000) {
      for (i = 0; i < homeRails.length; i += 2) { if (homeRails[i].loaded) { for (j = 0; j < homeRails[i].items.length; j += 1) { if (homeRails[i].items[j].id === entry.movieId) { matches = true; } } } }
    }
    suggestedCollection = matches ? entry : null;
    button.textContent = matches ? 'Sammlung: ' + entry.name : '';
    button.style.display = matches ? 'block' : 'none';
    document.getElementById('home-actor').style.display = !matches && suggestedActor ? 'block' : 'none';
  }
  function openSuggestedCollection() {
    var entry = suggestedCollection;
    if (!entry || !isConnected()) { return; }
    setPage('sammlungen'); abortMovies(); collectionId = entry.id; collectionName = entry.name; collectionOrigin = null;
    collectionActorId = ''; collectionActorName = ''; selectedGenres = []; movieItems = []; moviePages = []; movieStart = 0; movieTotal = 0; movieNeedsRefresh = false;
    renderSection(); focusElement(currentNav()); collectionFocusPending = true; loadMovies(0, false, true);
  }

  function selectBanner(latest) {
    var profileKey = collectionHistoryKey();
    if (!profileKey) { return null; }
    var key = 'banner.' + profileKey, state = bannerMemory[key], now = new Date();
    var hour = now.getHours(), day = now.getDay(), weekend = day === 0 || day === 6;
    var period = hour < 5 || hour >= 23 ? 'night' : hour < 11 ? 'morning' : hour < 17 ? 'day' : 'evening';
    if (!state) {
      try { state = JSON.parse(window.localStorage.getItem(key) || 'null'); } catch (ignore) {}
      if (!state || !Array.isArray(state.seen)) { state = { seen: [], latest: '' }; }
      bannerMemory[key] = state;
    }
    var event = latest && state.latest && state.latest !== latest.id ? 'new-film' : '';
    if (latest) { state.latest = latest.id; }
    var values = { name: document.getElementById('auth-user').value.trim(), filmtitel: latest ? latest.title : '' };
    function fill(text) {
      var missing = false;
      var result = text.replace(/\{([a-z]+)\}/g, function (placeholder, name) {
        if (!Object.prototype.hasOwnProperty.call(values, name) || !values[name]) { missing = true; return ''; }
        return values[name];
      });
      return missing ? '' : result;
    }
    var best = null, priority = -1, age = Infinity, i, entry, position, rank, detail, question;
    for (i = 0; i < window.bannerTexts.length; i += 1) {
      entry = window.bannerTexts[i];
      if ((entry.period && entry.period !== period) || (entry.weekend && !weekend) || (entry.event && entry.event !== event)) { continue; }
      detail = fill(entry.text);
      question = entry.question ? fill(entry.question) : '';
      if (!detail || (entry.question && !question)) { continue; }
      position = state.seen.indexOf(entry.id);
      rank = entry.event ? 3 : position < 0 ? (entry.period || entry.weekend ? 2 : 1) : 0;
      if (rank > priority || (rank === priority && position < age)) {
        best = { id: entry.id, detail: detail, question: question };
        priority = rank;
        age = position;
      }
    }
    if (best) {
      position = state.seen.indexOf(best.id);
      if (position >= 0) { state.seen.splice(position, 1); }
      state.seen.push(best.id);
    }
    try { window.localStorage.setItem(key, JSON.stringify(state)); } catch (ignoreWrite) {}
    return best;
  }

  function updateHomeGreeting() {
    var name = document.getElementById('auth-user').value.replace(/^\s+|\s+$/g, '').substring(0, 32);
    var hour = new Date().getHours();
    var headline = hour < 5 || hour >= 23 ? 'Noch wach' : hour < 11 ? 'Guten Morgen' : hour < 17 ? 'Hallo' : 'Guten Abend';
    var detail = bannerChoice ? bannerChoice.detail : 'Deine Filmwelt wartet auf dich.';
    document.getElementById('home-greeting').textContent = bannerChoice && bannerChoice.question ? bannerChoice.question : headline + (name ? ', ' + name : '') + (headline === 'Noch wach' ? '?' : '.');
    document.getElementById('home-greeting-detail').textContent = detail;
    document.getElementById('profile-button-name').textContent = name || 'Profil';
    document.getElementById('brand-avatar').textContent = name ? name.charAt(0).toUpperCase() : 'S';
  }

  function firstHomeCard() { return (suggestedCollection && document.getElementById('home-collection')) || (suggestedActor && document.getElementById('home-actor')) || homeCards(homeRails[0])[0] || homeCards(homeRails[1])[0] || homeCards(homeRails[2])[0] || document.getElementById('profile-button'); }

  function refreshHome() {
    var i, zone, cards;
    if (page !== 'start' || modal || !isConnected()) { return; }
    homeDirty = false; abortHome(); homeRefreshFocus = null;
    zone = focused && focused.getAttribute('data-zone');
    for (i = 0; i < homeRails.length; i += 1) {
      if (zone === 'home-' + homeRails[i].id) { cards = homeCards(homeRails[i]); homeRefreshFocus = { rail: homeRails[i].id, element: focused, id: focused.getAttribute('data-movie-id'), index: Math.max(0, indexOfNode(cards, focused)) }; }
      loadHomeRail(homeRails[i], homeRails[i].start);
    }
  }

  function setPage(nextPage) {
    var nav = nodesForZone('nav');
    var started = diagnostics ? diagnostics.now() : 0;
    var activeIndex = 0;
    var indicator = document.getElementById('nav-indicator');
    var i;
    if (nextPage === page) { focusElement(currentNav()); if (isConnected() && isMoviePage()) { abortMovies(); loadMovies(0, false, true); } else if (isConnected() && page === 'start') { loadHome(); } return; }
    if (request) { cancelRequest('Verbindung abgebrochen.'); }
    if (page === 'suche' && searchActorId && nextPage !== 'suche') { actorOrigin = null; }
    abortPeople();
    abortMovies();
    abortHome();
    genreRevision += 1;
    if (genreRequest) { genreRequest.abort(); genreRequest = null; }
    searchActorId = ''; seriesContext = null; collectionId = ''; collectionName = ''; collectionOrigin = null; collectionFocusPending = false; moviePages = []; movieItems = []; movieStart = 0; movieTotal = 0; movieNeedsRefresh = false;
    document.getElementById('actor-back').style.display = 'none';
    page = nextPage;
    selectedGenres = []; draftGenres = []; collectionActorId = ''; collectionActorName = '';
    if ((page === 'filme' || page === 'entdecken' || page === 'sammlungen') && isConnected()) { loadGenres(); }
    searchInput.value = '';
    for (i = 0; i < nav.length; i += 1) {
      removeClass(nav[i], 'is-active');
      nav[i].removeAttribute('aria-current');
      if (nav[i].getAttribute('data-page') === page) {
        activeIndex = i;
        addClass(nav[i], 'is-active');
        nav[i].setAttribute('aria-current', 'page');
      }
    }
    homeView.style.display = page === 'start' ? 'block' : 'none';
    if (page === 'start') { document.getElementById('library-filters').style.display = 'none'; }
    sectionView.style.display = page === 'start' ? 'none' : 'block';
    indicator.style.webkitTransform = 'translateY(' + (activeIndex * 72) + 'px)';
    indicator.style.transform = 'translateY(' + (activeIndex * 72) + 'px)';
    if (page === 'start' && isConnected()) { loadHome(); }
    if (page !== 'start') {
      renderSection();
      if (isConnected() && isMoviePage() && (page !== 'merkliste' || typeof jellyfin.favorites === 'function')) {
        if (movieNeedsRefresh) { loadMovies(0, false, true); }
        else if (!movieItems.length || !cachedMoviePage(movieStart)) { loadMovies(movieItems.length ? movieStart : 0, false); }
      }
    }
    animatePage(page === 'start' ? homeView : sectionView);
    focusElement(currentNav());
    if (diagnostics) { diagnostics.record('page-dom', diagnostics.now() - started, activeCards().length); }
  }

  function activeCards() {
    var container = page === 'start' ? document.getElementById('home-cards') : document.getElementById('section-cards');
    var nodes = container.querySelectorAll('[data-zone="cards"]');
    var result = [];
    var i;
    for (i = 0; i < nodes.length; i += 1) { if (isDisplayed(nodes[i])) { result.push(nodes[i]); } }
    return result;
  }

  function phoneStatus(message) { document.getElementById('phone-status').textContent = message; }
  function phoneIdentity(name) {
    phoneDeviceName = name || '';
    document.getElementById('profile-connect').textContent = phoneDeviceName ? phoneDeviceName + ' verbunden' : 'Smairys Connect nutzen';
    document.getElementById('phone-open').textContent = phoneDeviceName ? phoneDeviceName + ' · Smairys Connect' : 'Smairys Connect nutzen';
  }
  function connectAfterLogin(base, token) {
    var session = jellyfin, bridge, attempts = 0;
    if (!isConnected() || !window.SMAIRYS_PHONE) { return; }
    if (phoneBridge) { phoneBridge.close(); }
    bridge = window.SMAIRYS_PHONE.create({base:base, mediaBase:serverInput.value, client:session, transport:window.SMAIRYS_HTTP, onPlay:playFromPhone,
      onConnected:function (name) { if (bridge === phoneBridge) { phoneIdentity(name || 'Handy'); phoneStatus(phoneDeviceName + ' verbunden.'); } },
      onError:function () { if (bridge === phoneBridge) { phoneIdentity(''); phoneStatus('Verbindung beendet.'); } }});
    phoneBridge = bridge;
    function complete() {
      if (bridge !== phoneBridge || session !== jellyfin || !isConnected()) { window.SMAIRYS_HTTP.request({method:'POST',url:base + '/api/tv/close',headers:{Authorization:'Bearer ' + token,'Content-Type':'application/json'},body:'{}'}, function () {}); return; }
      attempts += 1;
      window.SMAIRYS_HTTP.request({method:'POST', url:base + '/api/tv/login-complete', headers:{Authorization:'Bearer ' + token, 'Content-Type':'application/json'}, body:'{}'}, function (error) {
        if (bridge !== phoneBridge || session !== jellyfin || !isConnected()) { complete(); return; }
        if (error && attempts < 4) { window.setTimeout(complete, 500); return; }
        if (error || !bridge.adopt(token)) { bridge.close(); phoneBridge = null; phoneIdentity(''); window.SMAIRYS_HTTP.request({method:'POST',url:base + '/api/tv/close',headers:{Authorization:'Bearer ' + token,'Content-Type':'application/json'},body:'{}'}, function () {}); }
      });
    }
    complete();
  }
  function showPhoneQr(bridge, image) {
    bridge.qr(function (error, svg) {
      if (bridge !== phoneBridge || phoneDeviceName) { return; }
      if (error) { phoneStatus('QR-Code nicht verfügbar.'); bridge.close(); return; }
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      image.style.display = 'block'; phoneStatus('QR-Code scannen.');
    });
  }
  function playFromPhone(id, callback) {
    var session = jellyfin;
    var bridge = phoneBridge;
    if (!isConnected() || !session || !id || typeof session.movieDetails !== 'function') { callback(false); return; }
    session.movieDetails(id, function (error, detail) {
      if (error || !detail || session !== jellyfin || bridge !== phoneBridge || !bridge || !bridge.isActive() || !isConnected()) { callback(false); return; }
      if (modal === 'player') { stopPlayer(); }
      if (modal === 'reading') { activate(document.getElementById('reading-close')); }
      if (modal === 'detail') { closeDetail(); }
      if (modal === 'connection') { closeConnection(); }
      if (modal) { callback(false); return; }
      phoneMovie = detail; openMovie(id);
      if (modal !== 'detail') { callback(false); return; }
      startPlayer(); callback(modal === 'player');
    });
  }
  function showPhoneConnection() {
    var companionUrl = companionAddress(serverInput.value);
    var image = document.getElementById('phone-qr');
    document.getElementById('profile-main').style.display = 'none';
    document.getElementById('phone-view').style.display = 'block';
    document.getElementById('connection-title').textContent = 'Smairys Connect';
    image.style.display = 'none'; image.removeAttribute('src');
    focusElement(document.getElementById('phone-done'));
    if (phoneBridge && phoneBridge.isActive()) { if (phoneDeviceName) { phoneStatus(phoneDeviceName + ' verbunden.'); } else { showPhoneQr(phoneBridge, image); } return; }
    if (!isConnected() || !companionUrl || !window.SMAIRYS_PHONE || !window.SMAIRYS_HTTP) { phoneStatus('Verbindung nicht verfügbar.'); return; }
    phoneStatus('Wird verbunden …');
    phoneBridge = window.SMAIRYS_PHONE.create({base:companionUrl,mediaBase:serverInput.value,client:jellyfin,transport:window.SMAIRYS_HTTP,onPlay:playFromPhone,
      onConnected:function (name) { phoneIdentity(name || 'Handy'); phoneStatus(phoneDeviceName + ' verbunden.'); image.style.display = 'none'; image.removeAttribute('src'); },
      onError:function () { phoneIdentity(''); phoneStatus('Verbindung beendet.'); image.style.display = 'none'; image.removeAttribute('src'); }});
    var bridge = phoneBridge;
    bridge.pair(function (error) {
      if (bridge !== phoneBridge) { return; }
      if (error) { phoneStatus('Verbindungsdienst nicht erreichbar.'); return; }
      showPhoneQr(bridge, image);
    });
  }
  function closePhoneView() {
    if (phoneBridge && !phoneBridge.isActive()) { phoneBridge.close(); phoneBridge = null; }
    document.getElementById('phone-view').style.display = 'none';
    document.getElementById('phone-qr').removeAttribute('src');
    document.getElementById('profile-main').style.display = 'block';
    document.getElementById('connection-title').textContent = 'Wer schaut gerade?';
    focusElement(document.getElementById('phone-open'));
  }

  function openConnection() {
    returnFocus = focused;
    modal = 'connection';
    document.getElementById('connection-modal').style.display = 'block';
    addClass(document.querySelector('.connection-panel'), 'is-opening');
    document.getElementById('profile-main').style.display = 'block';
    document.getElementById('phone-view').style.display = 'none';
    document.getElementById('quick-view').style.display = 'none';
    document.querySelector('.connection-feedback').style.display = 'block';
    document.getElementById('settings-view').style.display = 'none';
    document.getElementById('connection-title').textContent = 'Wer schaut gerade?';
    document.getElementById('profile-name').textContent = document.getElementById('auth-user').value || 'Melde dich bei deiner Mediathek an.';
    renderProfiles();
    focusElement(document.querySelector('.profile-row[aria-current]') || document.querySelector('.profile-row') || document.getElementById(isConnected() ? 'auth-logout' : 'auth-open'));
    if (!isConnected()) { restoreSavedSession(); }
  }

  function closeConnection() {
    cancelProfileSwitch();
    document.getElementById('phone-qr').removeAttribute('src');
    document.getElementById('phone-view').style.display = 'none';
    cancelRequest('Verbindung abgebrochen.');
    closeAuth();
    removeClass(document.querySelector('.connection-panel'), 'is-opening');
    document.getElementById('connection-modal').style.display = 'none';
    modal = '';
    focusElement(returnFocus || currentNav());
  }

  function closeAuth() {
    authRevision += 1;
    if (quickTimer !== null) { window.clearTimeout(quickTimer); quickTimer = null; }
    if (jellyfin && typeof jellyfin.cancelQuickConnect === 'function') { jellyfin.cancelQuickConnect(); }
    document.getElementById('quick-view').style.display = 'none';
    document.querySelector('.connection-feedback').style.display = 'block';
    if (authRequest) { authRequest.abort(); authRequest = null; if (!isConnected()) { jellyfin = null; } setConnectionStatus('', 'Anmeldung abgebrochen.'); }
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-user').readOnly = false;
    document.getElementById('auth-password').readOnly = false;
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('profile-main').style.display = 'block';
    document.getElementById('settings-view').style.display = 'none';
    document.getElementById('connection-title').textContent = 'Wer schaut gerade?';
    document.getElementById('connection-actions').style.display = 'block';
    document.getElementById('motion-setting').style.display = 'block';
    document.getElementById('auth-open').style.display = 'inline-block';
    document.getElementById('quick-open').style.display = isConnected() ? 'none' : 'inline-block';
    removeClass(document.querySelector('.connection-panel'), 'is-auth');
  }

  function updateSessionUI() {
    var connected = isConnected();
    if (connected) { updateHomeGreeting(); }
    else { document.getElementById('profile-button-name').textContent = 'Profil'; document.getElementById('brand-avatar').textContent = 'S'; }
    if (connected) { hideLogin(); }
    document.getElementById('preview-hero').style.display = connected ? 'none' : 'block';
    document.getElementById('home-library').style.display = connected ? 'block' : 'none';
    document.getElementById('preview-label').style.display = connected ? 'none' : 'inline-block';
    document.getElementById('home-cards').style.display = connected ? 'none' : 'block';
    document.querySelector('.rail-heading').style.display = connected ? 'none' : 'block';
    document.getElementById('samples-button').style.display = connected ? 'none' : 'inline-block';
    document.getElementById('auth-open').style.display = 'inline-block';
    document.getElementById('auth-open').textContent = connected ? '+ Profil hinzufügen' : 'Mit Passwort anmelden';
    renderProfiles();
    document.getElementById('quick-open').style.display = connected ? 'none' : 'inline-block';
    document.getElementById('auth-logout').style.display = connected ? 'inline-block' : 'none';
    document.getElementById('phone-open').style.display = connected ? 'inline-block' : 'none';
    document.querySelector('.profile-actions').className = connected ? 'profile-actions is-connected' : 'profile-actions';
    serverInput.readOnly = connected;
  }

  function endSession(keepProfile) {
    cancelProfileSwitch();
    if(clipCreateRequest){clipCreateRequest.abort();clipCreateRequest=null;}if(clipRequest){clipRequest.abort();clipRequest=null;}
    if(clipJobTimer!==null){window.clearTimeout(clipJobTimer);clipJobTimer=null;}if(clipJobRequest){clipJobRequest.abort();clipJobRequest=null;}clipJobItem='';clipJobId='';
    cancelRestore(); if (!keepProfile) { clearStoredSession(); }
    if (phoneBridge) { phoneBridge.close(); phoneBridge = null; } phoneIdentity(''); phoneMovie = null;
    homeDirty = false; homeRestore = null; homeRefreshFocus = null;
    playerReportRevision += 1;
    playerReportInFlight = false;
    playerReports = [];
    abortPeople();
    abortHome();
    for (var h = 0; h < homeRails.length; h += 1) { homeRails[h].items = []; renderHomeRail(homeRails[h]); }
    cancelDetailRequests();
    actorOrigin = null; castRestoreId = ''; favoriteListDirty = false;
    abortMovies();
    closeAuth();
    if (jellyfin && !keepProfile) {
      var active = typeof jellyfin.exportSession === 'function' ? jellyfin.exportSession() : null;
      var server = serverInput.value.trim().replace(/\/+$/, '');
      if (active) {
        try { writeProfiles(storedProfiles().filter(function (p) { return p.server !== server || p.session.userId !== active.userId; })); } catch (ignore) {}
      }
      jellyfin.logout();
    }
    jellyfin = null; movieItems = []; movieStart = 0; movieTotal = 0; moviePages = []; movieNeedsRefresh = false; activeMovieId = null;
    renderCards(document.getElementById('section-cards'), []);
    document.getElementById('detail-title').textContent = '';
    document.getElementById('detail-metadata').textContent = '';
    document.getElementById('detail-description').textContent = '';
    setDetailImages('', '');
    updateSessionUI();
  }

  function updateAuthWarning() {
    var base = serverInput.value.replace(/^\s+|\s+$/g, '');
    document.getElementById('auth-warning').style.display = /^http:\/\//i.test(base) ? 'block' : 'none';
  }

  function openAuth() {
    cancelProfileSwitch();
    cancelRestore();
    if (request) { cancelRequest('Verbindung abgebrochen.'); }
    document.getElementById('auth-form').style.display = 'block';
    document.getElementById('profile-main').style.display = 'none';
    document.getElementById('settings-view').style.display = 'none';
    document.getElementById('connection-title').textContent = 'Anmelden';
    document.getElementById('connection-actions').style.display = 'none';
    document.getElementById('auth-open').style.display = 'none';
    document.getElementById('motion-setting').style.display = 'none';
    addClass(document.querySelector('.connection-panel'), 'is-auth');
    updateAuthWarning();
    fillSavedPassword();
    focusElement(document.getElementById(!document.getElementById('auth-user').value ? 'auth-user' : (!document.getElementById('auth-password').value ? 'auth-password' : 'auth-submit')));
  }

  function openQuickConnect() {
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
    var revision;
    cancelRestore(); closeAuth();
    document.getElementById('profile-main').style.display = 'none';
    document.getElementById('quick-view').style.display = 'block';
    document.querySelector('.connection-feedback').style.display = 'none';
    document.getElementById('connection-title').textContent = 'Mit Handy anmelden';
    document.getElementById('quick-code').textContent = '';
    document.getElementById('quick-status').textContent = 'Wird vorbereitet …';
    document.getElementById('quick-retry').style.display = 'none';
    focusElement(document.getElementById('quick-cancel'));
    try { jellyfin = window.SMAIRYS_JELLYFIN.create(base); }
    catch (error) { document.getElementById('quick-status').textContent = 'Serveradresse in den Einstellungen prüfen.'; document.getElementById('quick-retry').style.display = 'inline-block'; return; }
    if (typeof jellyfin.beginQuickConnect !== 'function') { document.getElementById('quick-status').textContent = 'Quick Connect nicht verfügbar.'; return; }
    revision = ++authRevision; quickStarted = new Date().getTime();
    function failed(message) {
      document.getElementById('quick-status').textContent = message;
      document.getElementById('quick-retry').style.display = 'inline-block';
      focusElement(document.getElementById('quick-retry'));
    }
    function poll() {
      if (revision !== authRevision || modal !== 'connection') { return; }
      if (new Date().getTime() - quickStarted > 120000) { jellyfin.cancelQuickConnect(); failed('Code abgelaufen.'); return; }
      authRequest = jellyfin.pollQuickConnect(function (error, result) {
        if (revision !== authRevision || modal !== 'connection') { return; }
        authRequest = null;
        if (error || !result) { failed('Verbindung fehlgeschlagen.'); return; }
        if (!result.authenticated) { quickTimer = window.setTimeout(poll, 1500); return; }
        document.getElementById('quick-status').textContent = 'Anmeldung läuft …';
        authRequest = jellyfin.finishQuickConnect(function (finishError, user) {
          if (revision !== authRevision || modal !== 'connection') { return; }
          authRequest = null;
          if (finishError || !user) { failed('Anmeldung fehlgeschlagen.'); return; }
          document.getElementById('auth-user').value = user.name || '';
          rememberSession(base, user.name || '');
          rememberConnection(base, user.name || '', '');
          updateSessionUI(); closeConnection(); setConnectionStatus('ok', 'Angemeldet.'); setPage('filme');
        });
      });
    }
    authRequest = jellyfin.beginQuickConnect(function (error, result) {
      if (revision !== authRevision || modal !== 'connection') { return; }
      authRequest = null;
      if (error || !result) { failed('Quick Connect nicht verfügbar.'); return; }
      document.getElementById('quick-code').textContent = result.code;
      document.getElementById('quick-status').textContent = 'Warte auf Bestätigung …';
      quickTimer = window.setTimeout(poll, 1500);
    });
  }

  function submitAuth() {
    var user = document.getElementById('auth-user');
    var password = document.getElementById('auth-password');
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
    var username = user.value;
    var enteredPassword = password.value;
    var revision;
    if (authRequest) { return; }
    if (!user.value.replace(/^\s+|\s+$/g, '')) { password.value = ''; setConnectionStatus('error', 'Bitte einen Benutzernamen eingeben.'); focusElement(user); return; }
    try { jellyfin = window.SMAIRYS_JELLYFIN.create(base); }
    catch (error) { password.value = ''; closeAuth(); activate(document.getElementById('settings-open')); setConnectionStatus('error', 'Bitte eine gültige Serveradresse eingeben.'); return; }
    revision = ++authRevision;
    user.readOnly = true; password.readOnly = true;
    setConnectionStatus('', 'Anmeldung läuft …');
    authRequest = jellyfin.login(username, enteredPassword, function (error, authenticatedUser) {
      if (revision !== authRevision || modal !== 'connection') { return; }
      authRequest = null; password.value = ''; user.readOnly = false; password.readOnly = false;
      if (error) {
        setConnectionStatus('error', error.type === 'http' && (error.status === 401 || error.status === 403) ? 'Anmeldung fehlgeschlagen. Zugangsdaten prüfen.' : 'Anmeldung fehlgeschlagen. Verbindung prüfen.');
        focusElement(user); return;
      }
      if (authenticatedUser && authenticatedUser.name) { user.value = authenticatedUser.name; }
      rememberConnection(base, username, rememberSession(base, username) ? '' : enteredPassword);
      enteredPassword = '';
      updateSessionUI();
      closeConnection();
      setConnectionStatus('ok', 'Angemeldet.');
      setPage('filme');
    });
  }

  function setConnectionStatus(kind, message) {
    var status = document.getElementById('connection-status');
    status.className = 'connection-status' + (kind ? ' is-' + kind : '');
    status.textContent = message;
  }

  function setLoading(loading) {
    var button = document.getElementById('check-server');
    var panel = document.getElementById('connection-modal');
    if (!loading && orbitTimer !== null) { window.clearTimeout(orbitTimer); orbitTimer = null; }
    if (!loading) { removeClass(document.getElementById('connection-orbit'), 'is-visible'); }
    button.setAttribute('aria-disabled', loading ? 'true' : 'false');
    panel.setAttribute('aria-busy', loading ? 'true' : 'false');
  }

  function cancelRequest(message) {
    var previous = request;
    requestVersion += 1;
    request = null;
    setLoading(false);
    if (!previous) { return; }
    try { previous.abort(); } catch (error) {}
    if (diagnostics) { diagnostics.record('network-aborted', diagnostics.now() - requestStarted); }
    if (message) { setConnectionStatus('', message); }
  }

  function finishRequest(version, kind, message) {
    if (!request || requestVersion !== version || modal !== 'connection') { return; }
    request = null;
    setLoading(false);
    setConnectionStatus(kind, message);
    if (diagnostics) { diagnostics.record(kind === 'ok' ? 'network-success' : 'network-error', diagnostics.now() - requestStarted); }
  }

  function checkServer() {
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
    var version;
    if (request) { return; }
    try { base = window.SMAIRYS_JELLYFIN.normalizeAddress(base); }
    catch (error) {
      setConnectionStatus('error', 'Bitte eine gültige Adresse mit http:// oder https:// eingeben.');
      focusElement(serverInput);
      return;
    }
    setConnectionStatus('', 'Verbindung wird geprüft …');
    version = ++requestVersion;
    requestStarted = diagnostics ? diagnostics.now() : 0;
    setLoading(true);
    orbitTimer = window.setTimeout(function () {
      if (request && requestVersion === version && modal === 'connection') { addClass(document.getElementById('connection-orbit'), 'is-visible'); }
      orbitTimer = null;
    }, 200);
    request = window.SMAIRYS_HTTP.request({ url: base + '/System/Info/Public', timeout: 8000 }, function (error, info) {
      var message;
      if (!error && info && typeof info === 'object' && !Array.isArray(info)) {
        if (request && requestVersion === version && modal === 'connection') {
          rememberConnection(base, rememberedConnection && rememberedConnection.server === base ? rememberedConnection.username : '', rememberedConnection && rememberedConnection.server === base ? rememberedConnection.password : '');
        }
        finishRequest(version, 'ok', 'Verbunden mit ' + (info.ServerName || 'Jellyfin') + (info.Version ? ' · ' + info.Version : ''));
        return;
      }
      if (!error) { error = { type: 'parse' }; }
      if (error.type === 'timeout') { message = 'Zeitüberschreitung. Adresse und Netzwerk prüfen.'; }
      else if (error.type === 'http') { message = 'Verbindung fehlgeschlagen · HTTP ' + error.status; }
      else if (error.type === 'parse') { message = 'Der Server hat keine gültige Jellyfin-Antwort gesendet.'; }
      else if (error.type === 'open') { message = 'Die Serveradresse konnte nicht geöffnet werden.'; }
      else { message = 'Verbindung fehlgeschlagen. Adresse, Netzwerk und CORS prüfen.'; }
      finishRequest(version, 'error', message);
    });
  }

  function openDetail(index) {
    document.getElementById('detail-clips').style.display = 'none';
    var item = items[index];
    var isPerson;
    var saveButton = document.getElementById('save-button');
    if (!item || isConnected()) { return; }
    document.querySelector('.detail-cast').style.display = 'none';
    document.getElementById('play-button').style.display = 'none';
    returnFocus = focused;
    activeItem = index;
    modal = 'detail';
    isPerson = item.category === 'personen';
    document.getElementById('detail-copy').className = isPerson ? 'detail-copy is-person' : 'detail-copy';
    document.getElementById('detail-kicker').textContent = isPerson ? 'BEISPIELPERSON · VORSCHAU' : 'BEISPIELTITEL · VORSCHAU';
    document.getElementById('detail-title').textContent = item.title;
    document.getElementById('detail-metadata').textContent = '';
    document.getElementById('detail-description').textContent = item.description;
    setDetailImages('', '');
    document.getElementById('detail-art').className = 'detail-art art-' + item.art;
    document.getElementById('detail-footnote').textContent = '';
    saveButton.style.display = isPerson ? 'none' : 'inline-block';
    saveButton.textContent = saved[index] ? 'Aus Merkliste entfernen' : 'Merken';
    saveButton.setAttribute('aria-pressed', saved[index] ? 'true' : 'false');
    document.getElementById('detail-modal').style.display = 'block';
    updateDetailScroll();
    addClass(document.querySelector('.detail-panel'), 'is-opening');
    focusElement(isPerson ? document.getElementById('detail-close') : saveButton);
  }

  function setDetailImages(posterUrl, backdropUrl) {
    var parents = [document.getElementById('detail-art'), document.getElementById('detail-background')];
    var ids = ['detail-poster', 'detail-backdrop'];
    var urls = [posterUrl, backdropUrl];
    var previous;
    var image;
    var i;
    for (i = 0; i < parents.length; i += 1) {
      previous = document.getElementById(ids[i]);
      if (previous) { previous.onerror = null; previous.removeAttribute('src'); previous.parentNode.removeChild(previous); }
      image = document.createElement('img');
      image.id = ids[i]; image.alt = ''; image.style.display = 'none';
      parents[i].insertBefore(image, parents[i].firstChild);
      if (urls[i]) {
        image.onerror = function () { this.style.display = 'none'; };
        image.src = urls[i];
        image.style.display = 'block';
      }
    }
  }

  function updateDetailScroll() {
    var text = document.getElementById('detail-text-scroll');
    text.scrollTop = 0;
    document.getElementById('detail-read').textContent = 'Beschreibung';
    document.getElementById('detail-scroll-hint').style.display = 'none';
    document.getElementById('detail-read').style.display = document.getElementById('detail-description').textContent ? 'inline-block' : 'none';
  }

  function cancelDetailRequests() {
    detailRevision += 1;
    if (detailClock !== null) { window.clearInterval(detailClock); detailClock = null; }
    detailClockItem = null;
    if (detailRequest) { detailRequest.abort(); detailRequest = null; }
    if (trailerRequest) { trailerRequest.abort(); trailerRequest = null; }
    trailerId = ''; document.getElementById('trailer-button').style.display = 'none';
    if (favoriteRequest) { favoriteRequest.abort(); favoriteRequest = null; }
  }

  function setFavoriteButton() {
    var button = document.getElementById('save-button');
    button.textContent = detailFavorite ? 'Gemerkt ✓' : 'Merken';
    button.setAttribute('aria-pressed', detailFavorite ? 'true' : 'false');
  }

  function renderCast() {
    var list = document.getElementById('cast-list');
    var i, person, button, portrait, image, name;
    while (list.firstChild) { list.removeChild(list.firstChild); }
    for (i = castStart; i < Math.min(castItems.length, castStart + 5); i += 1) {
      person = castItems[i]; button = document.createElement('button'); button.type = 'button'; button.className = 'cast-card';
      button.setAttribute('data-zone', 'detail'); button.setAttribute('data-action', 'actor-select'); button.setAttribute('data-actor-id', person.id); button.setAttribute('data-actor-name', person.name);
      portrait = document.createElement('span'); portrait.className = 'cast-portrait';
      image = document.createElement('img'); image.alt = ''; if (person.imageUrl) { image.src = person.imageUrl; } else { image.style.visibility = 'hidden'; }
      image.onerror = function () { this.style.visibility = 'hidden'; }; portrait.appendChild(image);
      name = document.createElement('span'); name.className = 'cast-name'; name.textContent = person.name;
      button.appendChild(portrait); button.appendChild(name); list.appendChild(button);
    }
    document.getElementById('cast-status').textContent = castItems.length > 5 ? '‹  ' + (castStart + 1) + '–' + Math.min(castStart + 5, castItems.length) + ' von ' + castItems.length + '  ›   ·   Mit ← → blättern' : (castItems.length ? '' : 'Keine Besetzung verfügbar.');
  }

  function toggleFavorite() {
    var revision = detailRevision;
    var id = activeMovieId;
    if (detailRequest || favoriteRequest || !jellyfin || typeof jellyfin.setFavorite !== 'function' || document.getElementById('save-button').getAttribute('aria-disabled') === 'true') { return; }
    if (page === 'merkliste') { favoriteListDirty = true; }
    document.getElementById('save-button').setAttribute('aria-disabled', 'true');
    favoriteRequest = jellyfin.setFavorite(id, !detailFavorite, function (error, result) {
      if (revision !== detailRevision || (modal !== 'detail' && modal !== 'player') || activeMovieId !== id) { return; }
      favoriteRequest = null; document.getElementById('save-button').setAttribute('aria-disabled', 'false');
      if (error && error.type === 'unauthorized') { sessionExpired(); return; }
      if (error || !result) { document.getElementById('detail-footnote').textContent = 'Merken fehlgeschlagen.'; return; }
      detailFavorite = result.isFavorite; setFavoriteButton();
      if (page === 'merkliste') { favoriteListDirty = true; }
      document.getElementById('detail-footnote').textContent = '';
    });
  }

  function detailMetadata(item) {
    var parts = [], minutes, hours, rest, now, end, remaining, resuming;
    if (item.year) { parts.push(String(item.year)); }
    if (typeof item.durationSeconds === 'number' && isFinite(item.durationSeconds) && item.durationSeconds > 0) {
      minutes = Math.max(1, Math.round(item.durationSeconds / 60));
      hours = Math.floor(minutes / 60); rest = minutes % 60;
      parts.push((hours ? hours + ' Std.' : '') + (hours && rest ? ' ' : '') + (rest ? rest + ' Min.' : ''));
      resuming = typeof item.resumeSeconds === 'number' && isFinite(item.resumeSeconds) && item.resumeSeconds > 0 && item.resumeSeconds < item.durationSeconds;
      remaining = resuming ? item.durationSeconds - item.resumeSeconds : item.durationSeconds;
      now = new Date(); end = new Date(now.getTime() + remaining * 1000);
      if (!isNaN(end.getTime())) {
        parts.push('Endet um ' + ('0' + end.getHours()).slice(-2) + ':' + ('0' + end.getMinutes()).slice(-2) + ' Uhr');
      }
    }
    if (item.genres && item.genres.length) { parts.push(item.genres.join(' · ')); }
    document.getElementById('detail-metadata').textContent = parts.join(' · ');
  }

  function openMovie(id) {
    var item = null;
    var i, h;
    for (i = 0; i < movieItems.length; i += 1) { if (movieItems[i].id === id) { item = movieItems[i]; break; } }
    if (page === 'start') { for (h = 0; h < homeRails.length && !item; h += 1) { for (i = 0; i < homeRails[h].items.length; i += 1) { if (homeRails[h].items[i].id === id) { item = homeRails[h].items[i]; break; } } } }
    if (!item && phoneMovie && phoneMovie.id === id) { item = phoneMovie; }
    if (!item) { return; }
    cancelDetailRequests(); returnFocus = focused; activeMovieId = id; modal = 'detail';
    document.getElementById('detail-copy').className = 'detail-copy is-person';
    document.getElementById('detail-kicker').textContent = '';
    document.getElementById('detail-title').textContent = item.title;
    detailMetadata(item);
    detailClockItem = item;
    detailClock = window.setInterval(function () { if (modal === 'detail' && detailClockItem) { detailMetadata(detailClockItem); } }, 30000);
    document.getElementById('detail-description').textContent = item.description || 'Keine Beschreibung verfügbar.';
    document.getElementById('detail-art').className = 'detail-art';
    setDetailImages(item.imageUrl || '', item.backdropUrl || '');
    document.getElementById('detail-footnote').textContent = '';
    document.getElementById('play-button').style.display = 'inline-block';
    document.getElementById('detail-clips').style.display = 'inline-block';
    detailFavorite = false; castItems = []; castStart = 0;
    document.getElementById('save-button').style.display = 'inline-block';
    document.getElementById('save-button').setAttribute('aria-disabled', 'true'); setFavoriteButton();
    document.querySelector('.detail-cast').style.display = 'block';
    document.getElementById('cast-list').innerHTML = '';
    document.getElementById('cast-status').textContent = 'Besetzung wird geladen …';
    document.getElementById('detail-modal').style.display = 'block';
    updateDetailScroll();
    addClass(document.querySelector('.detail-panel'), 'is-opening');
    focusElement(document.getElementById('play-button'));
    if (jellyfin && typeof jellyfin.localTrailers === 'function') {
      var trailerRevision = detailRevision;
      trailerRequest = jellyfin.localTrailers(id, function (error, trailers) {
        if (trailerRevision !== detailRevision || activeMovieId !== id || (modal !== 'detail' && modal !== 'player')) { return; }
        trailerRequest = null;
        if (!error && trailers && trailers.length) { trailerId = trailers[0].id; document.getElementById('trailer-button').style.display = 'inline-block'; }
      });
    }
    if (jellyfin && typeof jellyfin.movieDetails === 'function') {
      var revision = detailRevision;
      detailRequest = jellyfin.movieDetails(id, function (error, detail) {
        if (revision !== detailRevision || (modal !== 'detail' && modal !== 'player') || activeMovieId !== id) { return; }
        detailRequest = null;
        if (error && error.type === 'unauthorized') { sessionExpired(); return; }
        if (error || !detail) { document.getElementById('cast-status').textContent = 'Details nicht verfügbar. Bitte Film erneut öffnen.'; return; }
        document.getElementById('detail-description').textContent = detail.description || item.description || 'Keine Beschreibung verfügbar.';
        detailClockItem = detail; detailMetadata(detail);
        setDetailImages(detail.imageUrl || item.imageUrl || '', detail.backdropUrl || item.backdropUrl || '');
        detailFavorite = detail.isFavorite; setFavoriteButton(); document.getElementById('save-button').setAttribute('aria-disabled', 'false');
        castItems = detail.people || [];
        if (castRestoreId) {
          var i;
          for (i = 0; i < castItems.length; i += 1) { if (castItems[i].id === castRestoreId) { castStart = Math.floor(i / 5) * 5; break; } }
        }
        renderCast(); updateDetailScroll();
        if (castRestoreId && modal === 'detail' && focused === document.getElementById('play-button')) {
          var castNodes = document.querySelectorAll('#cast-list [data-zone="detail"]');
          for (var j = 0; j < castNodes.length; j += 1) { if (castNodes[j].getAttribute('data-actor-id') === castRestoreId) { focusElement(castNodes[j]); break; } }
        }
        castRestoreId = '';
      });
    } else { document.getElementById('cast-status').textContent = 'Besetzung nicht verfügbar.'; }
  }

  function playerControls() {
    var controls = document.querySelector('.player-controls');
    if (playerTrackMenu) { return; }
    controls.style.display = 'block';
    document.getElementById('clip-entry').style.display = playerController && playerController.getState()==='paused' && playerInfo && !playerIsTrailer && !playerIsClip ? 'block' : 'none';
    if (playerHideTimer !== null) { window.clearTimeout(playerHideTimer); }
    playerHideTimer = window.setTimeout(function () {
      if (modal === 'player' && playerController && playerController.getState() === 'playing' && !seekRate) { controls.style.display = 'none'; }
      playerHideTimer = null;
    }, 5000);
  }

  function stopFastSeek(message) {
    var wasRunning = seekRate !== 0;
    if (seekRunTimer !== null) { window.clearTimeout(seekRunTimer); seekRunTimer = null; }
    seekRate = 0; seekWaitingSince = 0;
    if (wasRunning && playerController && (playerController.getState() === 'playing' || playerController.getState() === 'paused')) { reportPlayer('progress'); }
    if (message && modal === 'player') { document.getElementById('player-status').textContent = message; playerControls(); }
  }
  function seekBy(seconds) {
    var duration, position, target;
    if (!playerController || !playerAdapter || playerResumePending || clipSelection || clipRestorePending || (playerController.getState() !== 'playing' && playerController.getState() !== 'paused')) { return false; }
    duration = playerAdapter.getDuration(); position = playerAdapter.getPosition();
    if (!isFinite(duration) || duration <= 1 || !isFinite(position)) { return false; }
    target = Math.max(0.05, Math.min(duration - 0.05, position + seconds));
    if (Math.abs(target - position) < 0.05) { return false; }
    return playerController.seek(target);
  }
  function fastSeekTick() {
    var state;
    seekRunTimer = null;
    if (!seekRate || modal !== 'player' || !playerController || !playerAdapter) { stopFastSeek(); return; }
    state = playerController.getState();
    if (state === 'seeking' || state === 'buffering') {
      if (!seekWaitingSince) { seekWaitingSince = new Date().getTime(); }
      if (new Date().getTime() - seekWaitingSince > 15000) { stopFastSeek('Spulen unterbrochen.'); return; }
      seekRunTimer = window.setTimeout(fastSeekTick, 250); return;
    }
    seekWaitingSince = 0;
    if (state !== 'playing' && state !== 'paused') { stopFastSeek('Spulen nicht verfügbar.'); return; }
    if (!seekBy(seekDirection * seekRate)) { stopFastSeek(seekDirection > 0 ? 'Ende erreicht.' : 'Anfang erreicht.'); return; }
    document.getElementById('player-status').textContent = (seekDirection > 0 ? 'Vorspulen' : 'Zurückspulen') + ' · ' + (seekRate / 60) + ' Min. pro Sprung · OK stoppen';
    seekRunTimer = window.setTimeout(fastSeekTick, 1000);
  }
  function remoteFastSeek(direction) {
    if (!playerController || !playerAdapter || playerResumePending || clipSelection || clipRestorePending || playerTrackMenu) { return; }
    if (seekRate) {
      if (direction === seekDirection) { seekRate = seekRate === 60 ? 300 : 60; }
      else { seekDirection = direction; seekRate = 60; }
      document.getElementById('player-status').textContent = (direction > 0 ? 'Vorspulen' : 'Zurückspulen') + ' · ' + (seekRate / 60) + ' Min. pro Sprung · OK stoppen';
      playerControls(); return;
    }
    seekDirection = direction; seekRate = 60; fastSeekTick(); playerControls();
  }

  function companionAddress(server) {
    var normalized, configured, defaults = window.SMAIRYS_DEVICE_DEFAULTS || {};
    try {
      normalized = window.SMAIRYS_JELLYFIN.normalizeAddress(server);
      configured = defaults.companionUrls && defaults.companionUrls[normalized];
      if (configured) {
        configured = window.SMAIRYS_JELLYFIN.normalizeAddress(configured);
        if (/^https:/i.test(normalized) && !/^https:/i.test(configured)) { return ''; }
        return configured;
      }
    } catch (error) { return ''; }
    var match = /^(https?):\/\/(\[[^\]]+\]|[^\/:?#]+)(?::\d+)?(?:\/.*)?$/i.exec(normalized);
    return match ? match[1] + '://' + match[2] + ':8787' : '';
  }

  function clipBase() {
    return companionAddress(serverInput.value);
  }
  function clipCall(action, body, callback) {
    var session = jellyfin && jellyfin.exportSession ? jellyfin.exportSession() : null, base = clipBase();
    if (!session || !session.token || !base) { window.setTimeout(function () { callback({type:'unavailable'}); }, 0); return null; }
    return window.SMAIRYS_HTTP.request({method:'POST',url:base+'/api/tv/clips/'+action,headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify(body),timeout:10000},callback);
  }
  function clipTime(value) {
    var total=Math.max(0,Math.floor(value || 0)), seconds=total%60, minutes=Math.floor(total/60)%60, hours=Math.floor(total/3600);
    return (hours<10?'0':'')+hours+':'+(minutes<10?'0':'')+minutes+':'+(seconds<10?'0':'')+seconds;
  }
  function currentClipAudio() {
    var tracks=playerInfo && playerInfo.audioTracks || [], current, nativeIndex=null, found=null, i, j;
    if (tracks.length===1) { return tracks[0].index; }
    current=playerAdapter && playerAdapter.getCurrentTracks();
    if (!current || !current.ok) { return null; }
    for (i=0;i<current.tracks.length;i+=1) { if (current.tracks[i].type==='AUDIO') { if (nativeIndex!==null) { return null; } nativeIndex=current.tracks[i].index; } }
    if (nativeIndex===null) { return null; }
    for (j=0;j<tracks.length;j+=1) { if (nativeAudioIndex(tracks[j])===nativeIndex) { if (found!==null) { return null; } found=tracks[j].index; } }
    return found;
  }
  function renderClipSelection() {
    var s=clipSelection.snapshot(), start=s.start===null?0:s.start, end=s.end===null?s.position:s.end;
    document.getElementById('clip-position').textContent=clipTime(s.position)+' / '+clipTime(s.duration);
    document.getElementById('clip-start').textContent='Start '+(s.start===null?'–':clipTime(s.start));
    document.getElementById('clip-end').textContent='Ende '+(s.end===null?'–':clipTime(s.end));
    document.getElementById('clip-length').textContent=s.end!==null?clipTime(s.end-s.start):'';
    document.getElementById('clip-cursor').style.left=(100*s.position/s.duration)+'%';
    document.getElementById('clip-range').style.left=(100*Math.min(start,end)/s.duration)+'%';
    document.getElementById('clip-range').style.width=(s.start===null?0:100*Math.abs(end-start)/s.duration)+'%';
    document.getElementById('clip-mark').textContent=s.start===null?'Start setzen':(s.end===null?'Ende setzen':'Neu markieren');
    document.getElementById('clip-save').style.display=s.ready?'inline-block':'none';
  }
  function seekClipPosition() {
    var pos;
    clipSeekTimer=null;
    if (!clipSelection || !playerController || !playerAdapter || clipSeekPending || playerController.getState()!=='paused') { return; }
    pos=clipSelection.snapshot().position;
    if (Math.abs(playerAdapter.getPosition()-pos)<0.1) { clipSeekDirty=false; document.getElementById('clip-status').textContent=''; return; }
    clipSeekDirty=false; clipSeekPending=true; document.getElementById('clip-status').textContent='Position wird geladen …';
    if (!playerController.seek(Math.max(0.05,Math.min(playerAdapter.getDuration()-0.05,pos)))) { clipSeekPending=false; document.getElementById('clip-status').textContent='Position nicht verfügbar'; }
  }
  function restoreClipPosition() {
    if (!clipRestorePending || !playerController || !playerAdapter || clipSeekPending || playerController.getState()!=='paused') { return; }
    if (clipRestorePending===2 || Math.abs(playerAdapter.getPosition()-clipOriginalPosition)<0.1) { clipRestorePending=false; playerReportsSuppressed=false; return; }
    clipRestorePending=2;
    if (!playerController.seek(Math.max(0.05,Math.min(playerAdapter.getDuration()-0.05,clipOriginalPosition)))) { clipRestorePending=false; document.getElementById('player-status').textContent='Position konnte nicht wiederhergestellt werden.'; }
  }
  function closeClipSelection() {
    if (!clipSelection) { return; }
    clipSelection=null; clipSeekDirty=false;
    if (clipSeekTimer!==null) { window.clearTimeout(clipSeekTimer); clipSeekTimer=null; }
    document.getElementById('clip-panel').style.display='none';
    clipRestorePending=1; focusElement(document.getElementById('clip-entry')); restoreClipPosition();
  }
  function openClipSelection() {
    var duration, position;
    if (!playerController || playerController.getState()!=='paused' || !playerInfo || playerIsTrailer || playerIsClip) { return; }
    if (playerInfo.playMethod!=='DirectPlay') { document.getElementById('player-status').textContent='Clips nur bei Direktwiedergabe verfügbar.'; return; }
    if (playerResumePending || clipRestorePending || !window.SMAIRYS_CLIP_SELECTION) { document.getElementById('player-status').textContent='Clip noch nicht verfügbar.'; return; }
    duration=playerAdapter.getDuration();position=playerAdapter.getPosition();
    if (duration<=1 || !isFinite(position) || position<0 || position>duration) { document.getElementById('player-status').textContent='Clipposition nicht verfügbar.'; return; }
    clipOriginalPosition=position; playerReportsSuppressed=true; clipSelection=window.SMAIRYS_CLIP_SELECTION.create(duration,position);
    document.getElementById('clip-status').textContent=''; document.getElementById('clip-panel').style.display='block'; renderClipSelection(); focusElement(document.getElementById('clip-mark'));
  }
  function saveClip() {
    var state, audio, item, source, selection=clipSelection, version=playerRevision, client=jellyfin;
    if (!clipSelection || clipSeekPending || clipSeekDirty || !playerController || playerController.getState()!=='paused' || !playerInfo || clipCreateRequest) { return; }
    state=clipSelection.snapshot();audio=currentClipAudio();item=playerInfo.itemId;source=playerInfo.mediaSourceId;
    if (!state.ready) { return; }
    if (audio===null) { document.getElementById('clip-status').textContent='Tonspur nicht eindeutig.'; return; }
    document.getElementById('clip-status').textContent='Clip wird vorbereitet …';
    clipCreateRequest=clipCall('create',{itemId:item,mediaSourceId:source,audioIndex:audio,start:state.start,end:state.end},function(error,data){
      clipCreateRequest=null;
      if (client!==jellyfin || !isConnected()) { return; }
      if (error || !data || !data.id) { if(clipSelection===selection && playerRevision===version && modal==='player'){document.getElementById('clip-status').textContent='Clip konnte nicht erstellt werden.';} return; }
      clipJobItem=item;clipJobId=data.id;clipJobCount=0;clipJobErrors=0;
      if(clipJobTimer!==null){window.clearTimeout(clipJobTimer);}clipJobTimer=window.setTimeout(pollClipJob,2000);
      if(clipSelection===selection && playerRevision===version && modal==='player'){document.getElementById('clip-status').textContent='Clip wird erstellt.';closeClipSelection();document.getElementById('player-status').textContent='Clip wird erstellt.';}
    });
  }
  function pollClipJob() {
    var item=clipJobItem,id=clipJobId;
    clipJobTimer=null;
    if(!item || !id || !isConnected()){return;}
    clipJobRequest=clipCall('status',{itemId:item,id:id},function(error,data){
      clipJobRequest=null;
      if(item!==clipJobItem || id!==clipJobId){return;}
      if(error && ++clipJobErrors<4){clipJobTimer=window.setTimeout(pollClipJob,2000);return;}
      if(!error){clipJobErrors=0;}
      if(error || !data || data.state==='failed' || data.state==='ready' || ++clipJobCount>=60){
        var message=error || !data || clipJobCount>=60?'Clipstatus nicht verfügbar.':(data.state==='ready'?'Clip gespeichert.':'Clip konnte nicht erstellt werden.');
        clipJobItem='';clipJobId='';
        if(modal==='player' && activeMovieId===item && !clipSelection){document.getElementById('player-status').textContent=message;}
        else if(modal==='clip-list' && activeMovieId===item){if(!error && data && data.state==='ready' && !document.getElementById('clip-list-items').firstChild){openClipList();}else{document.getElementById('clip-list-status').textContent=message;}}
        return;
      }
      clipJobTimer=window.setTimeout(pollClipJob,2000);
    });
  }
  function closeClipList() {
    clipListRevision+=1; if (clipRequest) { clipRequest.abort(); clipRequest=null; }
    document.getElementById('clip-list-view').style.display='none'; modal='detail'; focusElement(document.getElementById('detail-clips'));
  }
  function openClipList() {
    var revision=++clipListRevision, item=activeMovieId;
    if (!isConnected() || !item) { return; }
    modal='clip-list'; document.getElementById('clip-list-view').style.display='block';
    document.getElementById('clip-list-items').textContent=''; document.getElementById('clip-list-status').textContent='Wird geladen …'; focusElement(document.getElementById('clip-list-back'));
    clipRequest=clipCall('list',{itemId:item},function(error,data){
      var list=document.getElementById('clip-list-items'),i,button;
      if (modal!=='clip-list' || revision!==clipListRevision || item!==activeMovieId) { return; }
      clipRequest=null;
      if (error || !Array.isArray(data)) { document.getElementById('clip-list-status').textContent='Clips nicht verfügbar.'; return; }
      document.getElementById('clip-list-status').textContent=data.length?'':(clipJobItem===item?'Clip wird erstellt …':'Noch keine Clips.');
      for(i=0;i<data.length && i<100;i+=1) { button=document.createElement('button');button.type='button';button.className='collection-actor-result';button.setAttribute('data-zone','clip-list');button.setAttribute('data-action','clip-play');button.setAttribute('data-clip-id',data[i].id);button.textContent='Clip '+(i+1)+' · '+clipTime(data[i].start)+' · '+clipTime(data[i].duration);list.appendChild(button); }
      if (list.firstChild) { focusElement(list.firstChild); }
    });
  }
  function playPersonalClip(id) {
    var revision=clipListRevision,item=activeMovieId,base=clipBase();
    if (clipRequest || !id || !base) { return; }
    document.getElementById('clip-list-status').textContent='Wird geladen …';
    clipRequest=clipCall('ticket',{itemId:item,id:id},function(error,data){
      var api=window.webapis && window.webapis.avplay,version;
      if (modal!=='clip-list' || revision!==clipListRevision) { return; }
      clipRequest=null;
      if (error || !data || !/^[A-Za-z0-9_-]{43}$/.test(data.ticket || '') || !api) { document.getElementById('clip-list-status').textContent='Clip nicht verfügbar.'; return; }
      document.getElementById('clip-list-view').style.display='none'; modal='player';playerIsClip=true;playerIsTrailer=false;playerReportsSuppressed=true;
      document.getElementById('player-audio').style.display='none';document.getElementById('player-text').style.display='none';
      document.getElementById('player-title').textContent='Clip · '+document.getElementById('detail-title').textContent;document.getElementById('player-status').textContent='Wird geladen …';document.getElementById('player-view').style.display='block';playerControls();focusElement(document.getElementById('player-toggle'));version=++playerRevision;
      try { playerAdapter=window.SMAIRYS_AVPLAY.create(api);playerController=window.SMAIRYS_PLAYBACK.createController(playerAdapter);playerController.subscribe(function(event){if(version!==playerRevision || modal!=='player')return;if(event.state==='playing'){document.getElementById('player-status').textContent='Wiedergabe';document.getElementById('player-toggle').textContent='Pause';playerControls();}else if(event.state==='paused'){document.getElementById('player-status').textContent='Pausiert';document.getElementById('player-toggle').textContent='Fortsetzen';playerControls();}else if(event.state==='error'){document.getElementById('player-status').textContent='Wiedergabe fehlgeschlagen.';}else if(event.state==='stopped'){stopPlayer();}});playerController.load(base+'/api/tv/clips/content/'+data.ticket); } catch(ignore) { document.getElementById('player-status').textContent='Wiedergabe nicht verfügbar.'; }
    });
  }

  function trackLanguage(language) {
    var code = String(language || '').toLowerCase().replace(/_/g, '-').split('-')[0];
    if (code === 'de' || code === 'deu' || code === 'ger') { return 'Deutsch'; }
    if (code === 'en' || code === 'eng') { return 'Englisch'; }
    return code ? code.toUpperCase() : 'Unbekannt';
  }

  function nativeAudioIndex(choice) {
    var result, nativeTracks = [], server, seen = {}, i, code, other, matches = [];
    if (!playerInfo || playerInfo.playMethod !== 'DirectPlay' || !playerAdapter || !choice) { return null; }
    server = playerInfo.audioTracks || [];
    result = playerAdapter.getTracks();
    if (!result.ok) { return null; }
    for (i = 0; i < result.tracks.length; i += 1) {
      if (result.tracks[i].type === 'AUDIO') {
        other = result.tracks[i];
        if (seen[other.index]) { return null; }
        seen[other.index] = true; nativeTracks.push(other);
      }
    }
    code = trackLanguage(choice.language);
    if (code !== 'Unbekannt') {
      for (i = 0; i < server.length; i += 1) { if (trackLanguage(server[i].language) === code) { matches.push(server[i]); } }
      if (matches.length === 1) {
        matches = [];
        for (i = 0; i < nativeTracks.length; i += 1) { if (trackLanguage(nativeTracks[i].language) === code) { matches.push(nativeTracks[i]); } }
        if (matches.length === 1) { return matches[0].index; }
      }
    }
    if (nativeTracks.length !== server.length) { return null; }
    seen = {};
    for (i = 0; i < server.length; i += 1) {
      if (seen[server[i].index]) { return null; }
      seen[server[i].index] = true;
      code = trackLanguage(server[i].language); other = trackLanguage(nativeTracks[i].language);
      if (code !== 'Unbekannt' && other !== 'Unbekannt' && code !== other) { return null; }
    }
    for (i = 0; i < server.length; i += 1) { if (server[i].index === choice.index) { return nativeTracks[i].index; } }
    return null;
  }

  function clearSubtitle() {
    if (subtitleTimer !== null) { window.clearTimeout(subtitleTimer); subtitleTimer = null; }
    document.getElementById('player-subtitle').textContent = '';
    document.getElementById('player-subtitle').style.display = 'none';
  }

  function stopServerSubtitle() {
    if (subtitlePoll !== null) { window.clearInterval(subtitlePoll); subtitlePoll = null; }
    subtitleCues = null; subtitleServerIndex = null; clearSubtitle();
  }

  function parseSubtitleTime(value) {
    var parts = value.split(':');
    if ((parts.length !== 2 && parts.length !== 3) || !/^\d{2}\.\d{3}$/.test(parts[parts.length - 1]) || !/^\d{2}$/.test(parts[parts.length - 2]) || (parts.length === 3 && !/^\d{2,}$/.test(parts[0]))) { return NaN; }
    return Number(parts[parts.length - 1]) + Number(parts[parts.length - 2]) * 60 + (parts.length === 3 ? Number(parts[0]) * 3600 : 0);
  }

  function parseSubtitleCues(data) {
    var lines = data.replace(/\r\n?/g, '\n').split('\n'), cues = [], i, match, start, end, text, lastStart = -1;
    for (i = 0; i < lines.length; i += 1) {
      match = /^(\d{2,}:\d{2}(?::\d{2})?\.\d{3})\s+-->\s+(\d{2,}:\d{2}(?::\d{2})?\.\d{3})(?:\s.*)?$/.exec(lines[i]);
      if (!match) { continue; }
      start = parseSubtitleTime(match[1]); end = parseSubtitleTime(match[2]); text = '';
      while (++i < lines.length && lines[i] !== '') { text += (text ? '\n' : '') + lines[i]; }
      if (!isFinite(start) || !isFinite(end) || end <= start || start < lastStart || cues.length >= 10000) { continue; }
      text = text.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').substring(0, 3000);
      cues.push({ start: start, end: end, text: text }); lastStart = start;
    }
    return cues;
  }

  function updateServerSubtitle() {
    var position, low = 0, high, mid, cue, target;
    if (!subtitleCues || !playerAdapter || !playerController || playerController.getState() === 'seeking') { clearSubtitle(); return; }
    position = playerAdapter.getPosition(); high = subtitleCues.length - 1;
    while (low <= high) { mid = Math.floor((low + high) / 2); if (subtitleCues[mid].start <= position) { low = mid + 1; } else { high = mid - 1; } }
    cue = high >= 0 ? subtitleCues[high] : null;
    target = document.getElementById('player-subtitle');
    if (cue && position < cue.end) { target.textContent = cue.text; target.style.display = 'block'; }
    else { target.textContent = ''; target.style.display = 'none'; }
  }

  function closeTrackMenu() {
    var previous = playerTrackMenu;
    if (playerRequest) { playerRequest.abort(); playerRequest = null; }
    playerTrackMenu = ''; playerTrackChoices = [];
    document.getElementById('track-menu').style.display = 'none';
    playerControls();
    focusElement(document.getElementById(previous === 'TEXT' ? 'player-text' : 'player-audio'));
  }

  function openTrackMenu(type) {
    var result;
    var list = document.getElementById('track-list');
    var status = document.getElementById('track-status');
    var current;
    var active = {};
    var i, track, button, nativeIndex, selected, n;
    if (!playerAdapter || !playerController || (playerController.getState() !== 'playing' && playerController.getState() !== 'paused')) { return; }
    playerTrackMenu = type; playerTrackChoices = [];
    document.querySelector('.player-controls').style.display = 'none';
    if (playerHideTimer !== null) { window.clearTimeout(playerHideTimer); playerHideTimer = null; }
    document.getElementById('track-menu').style.display = 'block';
    document.getElementById('track-title').textContent = type === 'AUDIO' ? 'Ton' : 'Untertitel';
    while (list.firstChild) { list.removeChild(list.firstChild); }
    if (type === 'AUDIO' && playerInfo && playerInfo.audioTracks && playerInfo.audioTracks.length && jellyfin && typeof jellyfin.selectAudio === 'function') {
      for (i = 0; i < playerInfo.audioTracks.length; i += 1) {
        track = playerInfo.audioTracks[i]; playerTrackChoices.push(track);
        button = document.createElement('button'); button.type = 'button'; button.className = 'track-option';
        button.setAttribute('data-zone', 'tracks'); button.setAttribute('data-action', 'server-audio-select'); button.setAttribute('data-track-index', String(track.index));
        nativeIndex = nativeAudioIndex(track); current = playerAdapter.getCurrentTracks(); selected = false;
        if (nativeIndex !== null && current.ok) { for (n = 0; n < current.tracks.length; n += 1) { if (current.tracks[n].type === 'AUDIO' && current.tracks[n].index === nativeIndex) { selected = true; } } }
        if (playerInfo.playMethod === 'Transcode' && playerInfo.audioStreamIndex === track.index) { selected = true; }
        button.textContent = (track.title || trackLanguage(track.language)) + ' · ' + (i + 1) + (nativeIndex === null ? ' · Neustart' : '') + (selected ? ' ✓' : ''); list.appendChild(button);
      }
      status.textContent = 'Nicht zuordenbare Spuren starten die Wiedergabe von vorn.';
      list.scrollTop = 0; focusElement(list.querySelector('[data-zone="tracks"]')); return;
    }
    result = playerAdapter.getTracks(); current = playerAdapter.getCurrentTracks();
    if (current.ok) { for (i = 0; i < current.tracks.length; i += 1) { if (current.tracks[i].type === type) { active[current.tracks[i].index] = true; } } }
    if (type === 'TEXT') {
      button = document.createElement('button'); button.type = 'button'; button.className = 'track-option'; button.setAttribute('data-zone', 'tracks'); button.setAttribute('data-action', 'track-off'); button.textContent = subtitleEnabled ? 'Aus' : 'Aus ✓'; list.appendChild(button);
    }
    if (type === 'TEXT' && playerInfo && playerInfo.subtitleTracks && jellyfin && typeof jellyfin.subtitleText === 'function') {
      for (i = 0; i < playerInfo.subtitleTracks.length; i += 1) {
        track = playerInfo.subtitleTracks[i];
        if (!track.text) { continue; }
        playerTrackChoices.push({ type: 'SERVER_TEXT', index: track.index });
        button = document.createElement('button'); button.type = 'button'; button.className = 'track-option';
        button.setAttribute('data-zone', 'tracks'); button.setAttribute('data-action', 'server-text-select'); button.setAttribute('data-track-index', String(track.index));
        if (playerInfo.playMethod !== 'DirectPlay') { button.disabled = true; button.removeAttribute('data-zone'); }
        button.textContent = (track.title || trackLanguage(track.language)) + (playerInfo.playMethod !== 'DirectPlay' ? ' · nur Direktwiedergabe' : (subtitleServerIndex === track.index ? ' ✓' : '')); list.appendChild(button);
      }
    }
    if (result.ok) {
      for (i = 0; i < result.tracks.length; i += 1) {
        track = result.tracks[i]; if (track.type !== type) { continue; }
        playerTrackChoices.push(track);
        button = document.createElement('button'); button.type = 'button'; button.className = 'track-option';
        button.setAttribute('data-zone', 'tracks'); button.setAttribute('data-action', 'track-select'); button.setAttribute('data-track-index', String(track.index));
        button.textContent = trackLanguage(track.language) + ' · ' + (playerTrackChoices.length) + (active[track.index] && (type !== 'TEXT' || (subtitleEnabled && subtitleServerIndex === null)) ? ' ✓' : ''); list.appendChild(button);
      }
    }
    status.textContent = !result.ok && !playerTrackChoices.length ? 'Spuren sind hier nicht verfügbar.' : (!playerTrackChoices.length ? (type === 'TEXT' ? 'Keine auswählbaren Textspuren. Bilduntertitel werden noch nicht unterstützt.' : 'Keine auswählbaren Spuren.') : (type === 'AUDIO' && playerController.getState() === 'paused' ? 'Zum Wechseln die Wiedergabe fortsetzen.' : ''));
    list.scrollTop = 0;
    focusElement(list.querySelector('[data-zone="tracks"]') || document.querySelector('#track-menu [data-action="tracks-close"]'));
  }

  function preferGermanAudio() {
    var result, i, chosen = null, index, count = 0;
    if (playerLanguageApplied || !playerAdapter || !playerInfo || playerInfo.playMethod !== 'DirectPlay') { return; }
    if (!playerInfo.audioTracks || !playerInfo.audioTracks.length) {
      result = playerAdapter.getTracks();
      if (!result.ok || !result.tracks.length) { return; }
      for (i = 0; i < result.tracks.length; i += 1) {
        if (result.tracks[i].type === 'AUDIO') {
          count += 1;
          if (trackLanguage(result.tracks[i].language) === 'Deutsch') {
            if (chosen) { playerLanguageApplied = true; return; }
            chosen = result.tracks[i];
          }
        }
      }
      if (!count) { return; }
      if (!chosen) { playerLanguageApplied = true; return; }
      index = chosen.index;
    } else {
    for (i = 0; i < playerInfo.audioTracks.length; i += 1) {
      if (trackLanguage(playerInfo.audioTracks[i].language) === 'Deutsch') {
        if (chosen) { playerLanguageApplied = true; return; }
        chosen = playerInfo.audioTracks[i];
      }
    }
    if (!chosen) { playerLanguageApplied = true; return; }
    index = nativeAudioIndex(chosen);
    if (index === null) { return; }
    }
    // Some TVs report a selected track without applying it; explicitly select it once.
    if (playerAdapter.selectTrack('AUDIO', index).ok) { playerLanguageApplied = true; }
  }

  function sendPlayerReports() {
    var entry;
    var revision;
    if (playerReportInFlight || !playerReports.length) { return; }
    entry = playerReports.shift();
    if (!entry.client.isAuthenticated()) { sendPlayerReports(); return; }
    playerReportInFlight = true;
    revision = playerReportRevision;
    entry.client.reportPlayback(entry.kind, entry.info, entry.position, entry.paused, function (error) {
      if (revision !== playerReportRevision) { return; }
      playerReportInFlight = false;
      if (!error && entry.kind === 'stopped' && entry.client === jellyfin) { homeDirty = true; if (page === 'start' && !modal) { refreshHome(); } }
      sendPlayerReports();
    });
  }

  function reportPlayer(kind) {
    if (playerReportsSuppressed || playerResumePending || !playerStarted || !playerInfo || !jellyfin || !jellyfin.isAuthenticated()) { return; }
    if (playerAdapter && playerController && playerController.getState() !== 'seeking') { playerPosition = playerAdapter.getPosition(); }
    playerReports.push({ client: jellyfin, kind: kind, info: playerInfo, position: playerPosition, paused: !!(playerController && playerController.getState() === 'paused') });
    sendPlayerReports();
  }

  function stopPlayer() {
    var returnToTrailer = playerIsTrailer;
    var returnToClips = playerIsClip;
    playerRevision += 1;
    stopFastSeek();
    if (clipSeekTimer!==null) { window.clearTimeout(clipSeekTimer); clipSeekTimer=null; }
    clipSelection=null; clipRestorePending=false; clipSeekPending=false; clipSeekDirty=false;
    document.getElementById('clip-panel').style.display='none';document.getElementById('clip-entry').style.display='none';
    if (playerRequest) { playerRequest.abort(); playerRequest = null; }
    if (playerTimer !== null) { window.clearInterval(playerTimer); playerTimer = null; }
    if (playerHideTimer !== null) { window.clearTimeout(playerHideTimer); playerHideTimer = null; }
    reportPlayer('stopped');
    if (playerController) { playerController.dispose(); playerController = null; }
    stopServerSubtitle(); subtitleEnabled = false; playerLanguageApplied = false; playerTrackMenu = ''; playerTrackChoices = [];
    document.getElementById('track-menu').style.display = 'none';
    playerAdapter = null; playerInfo = null; playerStarted = false; playerPosition = 0; playerResumePending = false; playerResumeTarget = 0; playerResumeSeekStarted = false; playerReportsSuppressed = false;
    playerIsTrailer = false; playerIsClip=false;
    document.getElementById('player-audio').style.display='inline-block';document.getElementById('player-text').style.display='inline-block';
    document.getElementById('player-view').style.display = 'none';
    if (modal === 'player') { modal = 'detail'; focusElement(document.getElementById(returnToClips ? 'detail-clips' : (returnToTrailer && trailerId ? 'trailer-button' : 'play-button'))); }
  }

  function startPlayer(asTrailer) {
    var version;
    var targetId = asTrailer === true ? trailerId : activeMovieId;
    var api = window.webapis && window.webapis.avplay;
    var title = document.getElementById('detail-title').textContent;
    if (!isConnected() || !targetId || playerRequest || playerController) { return; }
    if (!api || !window.SMAIRYS_AVPLAY || typeof jellyfin.playbackInfo !== 'function') {
      document.getElementById('detail-footnote').textContent = 'Wiedergabe auf diesem Gerät nicht verfügbar.'; return;
    }
    modal = 'player';
    playerIsTrailer = asTrailer === true;
    playerIsClip = false;
    document.getElementById('player-title').textContent = playerIsTrailer ? 'Trailer · ' + title : title;
    document.getElementById('player-status').textContent = 'Wird geladen …';
    document.getElementById('player-toggle').textContent = 'Pause';
    document.getElementById('player-view').style.display = 'block';
    playerControls(); focusElement(document.getElementById('player-toggle'));
    version = ++playerRevision;
    function startWithDetail(detailError, detail) {
      if (version !== playerRevision || modal !== 'player') { return; }
      playerRequest = null;
      if (detailError || !detail) { document.getElementById('player-status').textContent = 'Film konnte nicht geladen werden.'; return; }
      playerRequest = jellyfin.playbackInfo(targetId, function (error, info) {
      if (version !== playerRevision || modal !== 'player') { return; }
      playerRequest = null;
      if (error || !info) { document.getElementById('player-status').textContent = 'Film konnte nicht geladen werden.'; return; }
      playerInfo = info;
      playerReportsSuppressed = playerIsTrailer;
      playerResumeTarget = !playerIsTrailer ? detail.resumeSeconds : 0;
      playerResumePending = playerResumeTarget > 0;
      try {
        playerAdapter = window.SMAIRYS_AVPLAY.create(api);
        playerAdapter.setSubtitleListener(function (duration, text) {
          var milliseconds;
          if (version !== playerRevision || modal !== 'player' || !subtitleEnabled || subtitleCues) { return; }
          clearSubtitle();
          document.getElementById('player-subtitle').textContent = text.substring(0, 3000);
          document.getElementById('player-subtitle').style.display = 'block';
          milliseconds = Number(duration);
          subtitleTimer = window.setTimeout(clearSubtitle, isFinite(milliseconds) && milliseconds > 0 ? Math.min(milliseconds, 30000) : 4000);
        });
        playerController = window.SMAIRYS_PLAYBACK.createController(playerAdapter);
        playerController.subscribe(function (event) {
          if (version !== playerRevision || modal !== 'player') { return; }
          if (event.state === 'playing') {
            if (playerResumePending) {
              if (!playerResumeSeekStarted) {
                playerResumeSeekStarted = true;
                if (!playerController.seek(playerResumeTarget)) { document.getElementById('player-status').textContent = 'Fortsetzen fehlgeschlagen.'; }
                return;
              }
              if (event.previous !== 'seeking' && event.previous !== 'buffering') { return; }
              playerPosition = playerAdapter.getPosition();
              if (Math.abs(playerPosition - playerResumeTarget) > 10) {
                document.getElementById('player-status').textContent = 'Fortsetzen fehlgeschlagen.';
                return;
              }
              playerResumePending = false;
            }
            preferGermanAudio();
            document.getElementById('player-status').textContent = seekRate ? (seekDirection > 0 ? 'Vorspulen' : 'Zurückspulen') + ' · ' + (seekRate / 60) + ' Min. pro Sprung · OK stoppen' : 'Wiedergabe';
            document.getElementById('player-toggle').textContent = 'Pause';
            if (!playerStarted) { playerStarted = true; if (!playerIsTrailer && !playerIsClip) { rememberPlayedCollection(playerInfo.itemId); } reportPlayer('start'); }
            else if (!seekRate) { reportPlayer('progress'); }
            playerControls();
          } else if (event.state === 'paused') {
            if (clipSeekPending) {
              clipSeekPending=false;
              if (clipSelection && !clipSeekDirty) { var actual=playerAdapter.getPosition(), desired=clipSelection.snapshot().position; clipSelection.move(actual-desired); renderClipSelection(); document.getElementById('clip-status').textContent=''; }
              if (clipRestorePending) { restoreClipPosition(); }
              else if (clipSelection && clipSeekDirty) { if(clipSeekTimer!==null){window.clearTimeout(clipSeekTimer);}clipSeekTimer=window.setTimeout(seekClipPosition,150); }
            } else if (clipRestorePending) { restoreClipPosition(); }
            document.getElementById('player-status').textContent = seekRate ? (seekDirection > 0 ? 'Vorspulen' : 'Zurückspulen') + ' · ' + (seekRate / 60) + ' Min. pro Sprung · OK stoppen' : 'Pausiert';
            document.getElementById('player-toggle').textContent = 'Fortsetzen';
            if (!seekRate) { reportPlayer('progress'); } playerControls();
          } else if (event.state === 'buffering' || event.state === 'preparing' || event.state === 'seeking') {
            document.getElementById('player-status').textContent = 'Wird geladen …';
          } else if (event.state === 'error') {
            stopFastSeek(); document.getElementById('player-status').textContent = 'Wiedergabe fehlgeschlagen.'; playerControls();
          } else if (event.state === 'stopped') { stopPlayer(); }
        });
        playerController.load(info.url);
        if (version === playerRevision && playerController) { playerTimer = window.setInterval(function () { if (playerController && playerController.getState() === 'playing' && !seekRate) { preferGermanAudio(); reportPlayer('progress'); } }, 10000); }
      } catch (ignore) { document.getElementById('player-status').textContent = 'Wiedergabe nicht verfügbar.'; }
      });
    }
    if (playerIsTrailer) { startWithDetail(null, { resumeSeconds: 0 }); }
    else { playerRequest = jellyfin.movieDetails(targetId, startWithDetail); }
  }

  function closeDetail() {
    var previousIndex;
    var cards;
    var i;
    cancelDetailRequests(); castRestoreId = '';
    removeClass(document.querySelector('.detail-panel'), 'is-opening');
    document.getElementById('detail-modal').style.display = 'none';
    setDetailImages('', '');
    modal = '';
    if (page === 'start' && homeDirty) { focusElement(returnFocus || currentNav()); refreshHome(); return; }
    if (isConnected() && isMoviePage()) {
      cards = activeCards();
      for (i = 0; i < cards.length; i += 1) {
        if (cards[i].getAttribute('data-movie-id') === activeMovieId) { focusElement(cards[i]); if (favoriteListDirty && page === 'merkliste') { favoriteListDirty = false; abortMovies(); loadMovies(0, false, true); } return; }
      }
      focusElement(currentNav()); return;
    }
    if (page === 'merkliste') {
      previousIndex = indexOfNode(activeCards(), returnFocus);
      renderSection();
      cards = activeCards();
      for (i = 0; i < cards.length; i += 1) {
        if (cards[i].getAttribute('data-item') === String(activeItem)) { focusElement(cards[i]); return; }
      }
      focusElement(cards[Math.min(Math.max(previousIndex, 0), cards.length - 1)] || currentNav());
    }
    else { focusElement(returnFocus || currentNav()); }
  }

  function activate(element) {
    var action = element && element.getAttribute('data-action');
    var targetPage = element && element.getAttribute('data-page');
    if (modal === 'player' && seekRate) { stopFastSeek('Spulen beendet.'); return; }
    if (action === 'login-submit') { submitLogin(); }
    else if (action === 'login-server') { if (loginBusy) { return; } document.getElementById('login-server-input').value = serverInput.value; document.getElementById('login-server-box').style.display = 'block'; focusElement(document.getElementById('login-server-input')); }
    else if (action === 'login-server-save') { saveLoginServer(); }
    else if (action === 'login-qr-retry') { startLoginQuick(); }
    else if (targetPage) { setPage(targetPage); }
    else if (action === 'connection') { openConnection(); }
    else if (action === 'close-connection') { closeConnection(); }
    else if (action === 'check') { checkServer(); }
    else if (action === 'phone-open') { showPhoneConnection(); }
    else if (action === 'phone-done') { closePhoneView(); }
    else if (action === 'phone-stop') { if (phoneBridge) { phoneBridge.close(); phoneBridge = null; } phoneIdentity(''); phoneStatus('Verbindung getrennt.'); document.getElementById('phone-qr').style.display = 'none'; document.getElementById('phone-qr').removeAttribute('src'); }
    else if (action === 'quick-open' || action === 'quick-retry') { openQuickConnect(); }
    else if (action === 'quick-cancel') { closeAuth(); focusElement(document.getElementById('quick-open')); }
    else if (action === 'profile-switch') { switchProfile(element.getAttribute('data-profile-id')); }
    else if (action === 'auth-open' && isConnected()) {
      endSession(true);
      openAuth();
      document.getElementById('auth-user').value = '';
      document.getElementById('auth-password').value = '';
      focusElement(document.getElementById('auth-user'));
    }
    else if (action === 'auth-open') {
      fillSavedPassword();
      openAuth();
      if (document.getElementById('auth-user').value && document.getElementById('auth-password').value) { submitAuth(); }
    }
    else if (action === 'settings-open') {
      document.getElementById('profile-main').style.display = 'none';
      document.getElementById('settings-view').style.display = 'block';
      document.getElementById('connection-title').textContent = 'Einstellungen';
      focusElement(serverInput);
    }
    else if (action === 'settings-back') {
      cancelRequest('Verbindung abgebrochen.');
      document.getElementById('settings-view').style.display = 'none';
      document.getElementById('profile-main').style.display = 'block';
      document.getElementById('connection-title').textContent = 'Wer schaut gerade?';
      focusElement(document.getElementById('settings-open'));
    }
    else if (action === 'forget-profile') { forgetProfile(); }
    else if (action === 'auth-submit') { submitAuth(); }
    else if (action === 'auth-cancel') { closeAuth(); focusElement(document.getElementById('auth-open')); }
    else if (action === 'auth-logout') { endSession(); rememberConnection(serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, ''), document.getElementById('auth-user').value, ''); closeConnection(); setPage('start'); setConnectionStatus('', 'Abgemeldet.'); showLogin(); if (loginVisible) { startLoginQuick(); } }
    else if (action === 'samples') { focusElement(activeCards()[0]); }
    else if (action === 'detail') { openDetail(parseInt(element.getAttribute('data-item'), 10)); }
    else if (action === 'collection-open') { openCollection(element.getAttribute('data-movie-id')); }
    else if (action === 'home-collection') { openSuggestedCollection(); }
    else if (action === 'home-actor' && suggestedActor) { openActor(suggestedActor.id, suggestedActor.name); }
    else if (action === 'collection-actor-open') { openCollectionActor(); }
    else if (action === 'collection-actor-close') { closeCollectionActor(); }
    else if (action === 'collection-actor-clear') { applyCollectionActor('', ''); }
    else if (action === 'collection-actor-select') { applyCollectionActor(element.getAttribute('data-actor-id'), element.getAttribute('data-actor-name')); }
    else if (action === 'actor-next' || action === 'actor-prev') { actorBrowseStart = Math.max(0, actorBrowseStart + (action === 'actor-next' ? 6 : -6)); searchCollectionActors(); }
    else if (action === 'favorites-filter' || action === 'genre-filter' || action === 'sort-filter') {
      if (action === 'genre-filter') { openGenreFilter(); return; }
      if (action === 'favorites-filter') { favoriteFilter = favoriteFilter === 'all' ? 'unplayed' : (favoriteFilter === 'unplayed' ? 'played' : 'all'); }
      else { discoverSort = discoverSort === 'title' ? 'added' : (discoverSort === 'added' ? 'year' : 'title'); }
      abortMovies(); moviePages = []; movieItems = []; movieStart = 0; movieTotal = 0; movieNeedsRefresh = false; renderSection(); loadMovies(0, false, true); focusElement(element);
    }
    else if (action === 'genre-toggle') { var genreId = element.getAttribute('data-genre-id'), genreAt = draftGenres.indexOf(genreId); if (genreAt >= 0) { draftGenres.splice(genreAt, 1); } else if (draftGenres.length < 20) { draftGenres.push(genreId); } var genrePosition = indexOfNode(document.querySelectorAll('#genre-results button'), element); renderGenreOptions(); focusElement(document.querySelectorAll('#genre-results button')[genrePosition]); }
    else if (action === 'genre-clear') { draftGenres = []; renderGenreOptions(); focusElement(element); }
    else if (action === 'genre-close') { closeGenreFilter(); }
    else if (action === 'genre-apply') { selectedGenres = draftGenres.slice(); closeGenreFilter(); refreshFilteredMovies(document.getElementById('genre-filter')); }
    else if (action === 'filter-reset') { selectedGenres = []; collectionActorId = ''; collectionActorName = ''; refreshFilteredMovies(document.getElementById('genre-filter').style.display !== 'none' ? document.getElementById('genre-filter') : document.getElementById('collection-actor-filter')); }
    else if (action === 'search-mode' || action === 'series-search') { if (action === 'series-search' && !seriesEnabled()) { return; } searchMode = action === 'series-search' ? 'series' : (searchMode === 'movies' ? 'people' : 'movies'); peopleStart = 0; peopleTotal = 0; renderSection(); focusElement(element); }
    else if (action === 'series-open') { seriesContext = { seriesId: element.getAttribute('data-series-id'), seriesName: element.getAttribute('data-series-name'), seasonId: '', seasonName: '', seasonStart: 0 }; abortPeople(); renderSection(); loadSeriesChildren(0, false); }
    else if (action === 'season-open' && seriesContext) { seriesContext.seasonStart = peopleStart; seriesContext.seasonId = element.getAttribute('data-season-id'); seriesContext.seasonName = element.getAttribute('data-season-name'); renderSection(); loadSeriesChildren(0, false); }
    else if (action === 'movie-detail') { openMovie(element.getAttribute('data-movie-id')); if (seriesContext && modal === 'detail') { document.querySelector('.detail-cast').style.display = 'none'; } }
    else if (action === 'actor-select') { openActor(element.getAttribute('data-actor-id'), element.getAttribute('data-actor-name')); }
    else if (action === 'actor-back') { if (seriesContext) { backSeries(); } else { backToPeople(); } }
    else if (action === 'play-movie') { startPlayer(); }
    else if (action === 'clips-open') { openClipList(); }
    else if (action === 'clips-close') { closeClipList(); }
    else if (action === 'clip-play') { playPersonalClip(element.getAttribute('data-clip-id')); }
    else if (action === 'clip-open') { openClipSelection(); }
    else if (action === 'clip-mark' && clipSelection && !clipSeekPending && !clipSeekDirty) { var mark=clipSelection.mark(); if (!mark.ok) { document.getElementById('clip-status').textContent=mark.reason==='too-long'?'Maximal 5 Minuten.':'Ende muss nach Start liegen.'; } else { document.getElementById('clip-status').textContent=''; renderClipSelection(); if(mark.state.ready){focusElement(document.getElementById('clip-save'));} } }
    else if (action === 'clip-save') { saveClip(); }
    else if (action === 'play-trailer') { startPlayer(true); }
    else if (action === 'player-stop') { stopPlayer(); }
    else if (action === 'tracks-audio') { openTrackMenu('AUDIO'); }
    else if (action === 'tracks-text') { openTrackMenu('TEXT'); }
    else if (action === 'tracks-close') { closeTrackMenu(); }
    else if (action === 'track-off') { subtitleEnabled = false; stopServerSubtitle(); closeTrackMenu(); }
    else if (action === 'server-text-select') {
      var subtitleIndex = parseInt(element.getAttribute('data-track-index'), 10), subtitleFound = false, subtitleChoice, subtitleVersion = playerRevision, subtitleInfo = playerInfo;
      for (subtitleChoice = 0; subtitleChoice < playerTrackChoices.length; subtitleChoice += 1) { if (playerTrackChoices[subtitleChoice].type === 'SERVER_TEXT' && playerTrackChoices[subtitleChoice].index === subtitleIndex) { subtitleFound = true; break; } }
      if (subtitleFound && playerTrackMenu === 'TEXT' && !playerRequest && subtitleInfo && subtitleInfo.playMethod === 'DirectPlay') {
        document.getElementById('track-status').textContent = 'Untertitel werden geladen …';
        playerRequest = jellyfin.subtitleText(subtitleInfo.itemId, subtitleInfo.mediaSourceId, subtitleIndex, function (error, data) {
          var cues;
          if (subtitleVersion !== playerRevision || playerTrackMenu !== 'TEXT' || playerInfo !== subtitleInfo) { return; }
          playerRequest = null;
          if (error) { document.getElementById('track-status').textContent = 'Untertitel konnten nicht geladen werden.'; return; }
          cues = parseSubtitleCues(data);
          if (!cues.length) { document.getElementById('track-status').textContent = 'Keine lesbaren Untertitel gefunden.'; return; }
          stopServerSubtitle(); subtitleCues = cues; subtitleServerIndex = subtitleIndex; subtitleEnabled = true;
          updateServerSubtitle(); subtitlePoll = window.setInterval(updateServerSubtitle, 250); closeTrackMenu();
        });
      }
    }
    else if (action === 'server-audio-select') {
      var audioIndex = parseInt(element.getAttribute('data-track-index'), 10);
      var audioFound = false;
      var audioChoice;
      var audioRevision = playerRevision;
      var oldInfo = playerInfo;
      for (audioChoice = 0; audioChoice < playerTrackChoices.length; audioChoice += 1) { if (playerTrackChoices[audioChoice].index === audioIndex) { audioFound = true; break; } }
      if (audioFound && playerTrackMenu === 'AUDIO' && !playerRequest && oldInfo && playerController) {
        var mappedAudio = nativeAudioIndex(playerTrackChoices[audioChoice]);
        playerLanguageApplied = true;
        if (mappedAudio !== null) {
          if (playerAdapter.selectTrack('AUDIO', mappedAudio).ok) { closeTrackMenu(); }
          else { document.getElementById('track-status').textContent = playerController.getState() === 'paused' ? 'Zum Wechseln die Wiedergabe fortsetzen.' : 'Spur konnte nicht gewechselt werden.'; }
          return;
        }
        document.getElementById('track-status').textContent = 'Ton wird vorbereitet …';
        playerRequest = jellyfin.selectAudio(oldInfo.itemId, oldInfo.mediaSourceId, audioIndex, function (error, info) {
          if (audioRevision !== playerRevision || playerTrackMenu !== 'AUDIO' || playerInfo !== oldInfo) { return; }
          playerRequest = null;
          if (error || !info || info.playMethod !== 'Transcode' || info.audioStreamIndex !== audioIndex) { document.getElementById('track-status').textContent = 'Tonwechsel fehlgeschlagen. Wiedergabe läuft weiter.'; return; }
          reportPlayer('stopped');
          playerResumeTarget = playerAdapter ? playerAdapter.getPosition() : playerPosition;
          playerReportsSuppressed = false; playerStarted = false; playerResumePending = playerResumeTarget > 0; playerResumeSeekStarted = false;
          if (!info.audioTracks || !info.audioTracks.length) { info.audioTracks = oldInfo.audioTracks; }
          if (!info.subtitleTracks || !info.subtitleTracks.length) { info.subtitleTracks = oldInfo.subtitleTracks; }
          playerInfo = info; playerLanguageApplied = true; stopServerSubtitle(); subtitleEnabled = false;
          closeTrackMenu();
          document.getElementById('player-status').textContent = 'Neustart …';
          if (!playerController.load(info.url)) { document.getElementById('player-status').textContent = 'Neustart fehlgeschlagen.'; }
        });
      }
    }
    else if (action === 'track-select') {
      var index = parseInt(element.getAttribute('data-track-index'), 10);
      var found = false;
      var k;
      for (k = 0; k < playerTrackChoices.length; k += 1) { if (playerTrackChoices[k].index === index && playerTrackChoices[k].type === playerTrackMenu) { found = true; break; } }
      if (found && playerAdapter) {
        var result = playerAdapter.selectTrack(playerTrackMenu, index);
        if (result.ok) { if (playerTrackMenu === 'TEXT') { stopServerSubtitle(); subtitleEnabled = true; } else { playerLanguageApplied = true; } closeTrackMenu(); }
        else { document.getElementById('track-status').textContent = playerTrackMenu === 'AUDIO' && playerController.getState() === 'paused' ? 'Zum Wechseln die Wiedergabe fortsetzen.' : 'Spur konnte nicht gewechselt werden.'; }
      }
    }
    else if (action === 'player-back' || action === 'player-forward') { if (!seekBy(action === 'player-forward' ? 10 : -10)) { document.getElementById('player-status').textContent = 'Springen nicht verfügbar.'; } playerControls(); }
    else if (action === 'player-toggle' && playerController) { if (playerController.getState() === 'playing') { playerController.pause(); } else if (playerController.getState() === 'paused') { playerController.play(); } playerControls(); }
    else if (action === 'close-detail') { closeDetail(); }
    else if (action === 'reading-close') { document.getElementById('reading-view').style.display = 'none'; modal = 'detail'; focusElement(document.getElementById('detail-read')); }
    else if (action === 'detail-read') {
      var readingArt = document.getElementById('reading-art');
      var detailArt = document.getElementById('detail-art');
      var detailPoster = document.getElementById('detail-poster');
      readingArt.className = detailArt.className.replace('detail-art', 'reading-art');
      readingArt.innerHTML = '';
      if (detailPoster && detailPoster.style.display !== 'none') {
        var readingPoster = detailPoster.cloneNode(false);
        readingPoster.removeAttribute('id');
        readingArt.appendChild(readingPoster);
      }
      document.getElementById('reading-title').textContent = document.getElementById('detail-title').textContent;
      document.getElementById('reading-text').textContent = document.getElementById('detail-description').textContent;
      document.getElementById('reading-view').style.display = 'block';
      document.getElementById('reading-text').scrollTop = 0;
      modal = 'reading'; focusElement(document.getElementById('reading-close'));
    }
    else if (action === 'motion') { setMotion(element.getAttribute('data-mode'), true); }
    else if (action === 'save') {
      if (isConnected()) { toggleFavorite(); return; }
      saved[activeItem] = !saved[activeItem];
      document.getElementById('save-button').textContent = saved[activeItem] ? 'Aus Merkliste entfernen' : 'Merken';
      document.getElementById('save-button').setAttribute('aria-pressed', saved[activeItem] ? 'true' : 'false');
    }
  }

  function move(key) {
    var zone = focused && focused.getAttribute('data-zone');
    var cards;
    var index;
    if (modal) {
      zone = modal;
      if (modal === 'collection-actor') {
        var actors = document.querySelectorAll('#collection-actor-results [data-action="collection-actor-select"]');
        var actorIndex = indexOfNode(actors, focused), actorActions = [], actorButtons = document.querySelectorAll('#collection-actor-modal .modal-actions button'), actorActionIndex, ai;
        for (ai = 0; ai < actorButtons.length; ai += 1) { if (isDisplayed(actorButtons[ai])) { actorActions.push(actorButtons[ai]); } }
        actorActionIndex = indexOfNode(actorActions, focused);
        if (focused === document.getElementById('collection-actor-search')) { if (key === 40) { focusElement(actors[0] || actorActions[0]); return true; } if (key === 38) { return true; } return false; }
        if (actorIndex >= 0) {
          if (key === 37 && actorIndex % 3 > 0) { focusElement(actors[actorIndex - 1]); }
          else if (key === 39 && actorIndex % 3 < 2 && actorIndex + 1 < actors.length) { focusElement(actors[actorIndex + 1]); }
          else if (key === 38) { focusElement(actorIndex >= 3 ? actors[actorIndex - 3] : document.getElementById('collection-actor-search')); }
          else if (key === 40) { focusElement(actorIndex + 3 < actors.length ? actors[actorIndex + 3] : actorActions[0]); }
          return true;
        }
        if (actorActionIndex >= 0) {
          if (key === 37 || key === 39) { focusElement(actorActions[Math.max(0, Math.min(actorActions.length - 1, actorActionIndex + (key === 39 ? 1 : -1)))]); }
          else if (key === 38) { focusElement(actors[Math.max(0, actors.length - 3)] || document.getElementById('collection-actor-search')); }
          return true;
        }
      }
      if (modal === 'connection' && document.getElementById('profile-main').style.display !== 'none' && focused && focused.parentNode === document.querySelector('.profile-actions')) {
        var profileButtons = document.querySelectorAll('.profile-actions [data-zone="connection"]');
        var visibleButtons = [], profileIndex, destination, profileButtonIndex;
        for (profileButtonIndex = 0; profileButtonIndex < profileButtons.length; profileButtonIndex += 1) { if (isDisplayed(profileButtons[profileButtonIndex])) { visibleButtons.push(profileButtons[profileButtonIndex]); } }
        profileIndex = indexOfNode(visibleButtons, focused); destination = profileIndex;
        if (key === 38 || key === 40) { destination = Math.max(0, Math.min(visibleButtons.length - 1, profileIndex + (key === 40 ? 1 : -1))); }
        if (visibleButtons[destination]) { focusElement(visibleButtons[destination]); }
        return true;
      }
      if (modal === 'connection' && document.getElementById('settings-view').style.display !== 'none') {
        var activeMotion = document.querySelector('.motion-choice[aria-pressed="true"]') || document.querySelector('.motion-choice');
        var action = focused && focused.getAttribute('data-action');
        if (focused === serverInput) { if (key === 40) { focusElement(document.getElementById('check-server')); return true; } if (key === 38) { return true; } return false; }
        if (action === 'check' || action === 'settings-back') {
          if (key === 38) { focusElement(serverInput); }
          else if (key === 40) { focusElement(activeMotion); }
          else if (key === 37 || key === 39) { focusElement(document.getElementById(key === 37 ? 'check-server' : 'settings-back')); }
          return true;
        }
        if (action === 'motion') {
          if (key === 38) { focusElement(document.getElementById('check-server')); }
          else if (key === 40) { focusElement(document.getElementById('forget-profile')); }
          else if (key === 37 || key === 39) { var choices = document.querySelectorAll('.motion-choice'); var choiceIndex = indexOfNode(choices, focused); focusElement(choices[Math.max(0, Math.min(choices.length - 1, choiceIndex + (key === 39 ? 1 : -1)))]); }
          return true;
        }
        if (action === 'forget-profile') { if (key === 38) { focusElement(activeMotion); } return true; }
      }
      if (modal === 'reading') {
        if (key === 38 || key === 40) { document.getElementById('reading-text').scrollTop += key === 40 ? 300 : -300; }
        return true;
      }
      if (focused && focused.tagName === 'INPUT' && (key === 37 || key === 39)) { return false; }
      if (modal === 'detail' && isConnected()) {
        var castNodes = document.querySelectorAll('#cast-list [data-zone="detail"]');
        var castIndex = indexOfNode(castNodes, focused);
        if (castIndex >= 0) {
          if (key === 38) { focusElement(document.getElementById('play-button')); return true; }
          if (key === 37 && castIndex === 0 && castItems.length > 1) { castStart = castStart > 0 ? castStart - 5 : Math.floor((castItems.length - 1) / 5) * 5; renderCast(); castNodes = document.querySelectorAll('#cast-list [data-zone="detail"]'); focusElement(castNodes[castNodes.length - 1]); return true; }
          if (key === 39 && castIndex === castNodes.length - 1 && castItems.length > 1) { castStart = castStart + 5 < castItems.length ? castStart + 5 : 0; renderCast(); focusElement(document.querySelector('#cast-list [data-zone="detail"]')); return true; }
          if (key === 37 || key === 39) { focusElement(castNodes[Math.max(0, Math.min(castNodes.length - 1, castIndex + (key === 39 ? 1 : -1)))]); return true; }
          return true;
        }
        if (key === 40 && castNodes.length) { focusElement(castNodes[0]); return true; }
      }
      if (modal === 'detail' && !isConnected() && (key === 38 || key === 40)) {
        var text = document.getElementById('detail-text-scroll');
        if (text.scrollHeight > text.clientHeight) {
          text.scrollTop += key === 40 ? 120 : -120;
          return true;
        }
      }
      if (key === 38 || key === 37) { moveWithin(zone, -1); }
      if (key === 40 || key === 39) { moveWithin(zone, 1); }
      return true;
    }
    if (zone === 'nav') {
      if (key === 38 && focused && focused.getAttribute('data-page') === 'start') { focusElement(document.getElementById('profile-button')); }
      else if (key === 38) { moveWithin('nav', -1); }
      else if (key === 40) { moveWithin('nav', 1); }
      else if (key === 39) { focusElement(page === 'start' ? (isConnected() ? firstHomeCard() : nodesForZone('hero')[0]) : (seriesContext ? (activeCards()[0] || document.getElementById('actor-back')) : (page === 'suche' && !searchActorId ? searchInput : ((page === 'merkliste' || page === 'entdecken') && isConnected() ? document.getElementById('favorites-filter') : (activeCards()[0] || (page === 'sammlungen' && collectionId && isConnected() ? document.getElementById('collection-actor-filter') : document.getElementById('profile-button'))))))); }
    } else if (zone === 'profile') {
      if (key === 37) { var topFilters = nodesForZone('favorites-filter'); focusElement(focused.id === 'profile-button' && topFilters.length ? topFilters[topFilters.length - 1] : (focused.id === 'profile-button' && (searchActorId || seriesContext) ? document.getElementById('actor-back') : currentNav())); }
      else if (key === 39 && focused.id === 'actor-back') { focusElement(document.getElementById('profile-button')); }
      else if (key === 40) { focusElement(page === 'start' ? (isConnected() ? firstHomeCard() : nodesForZone('hero')[0]) : (page === 'suche' && !isConnected() ? searchInput : (activeCards()[0] || currentNav()))); }
    } else if (zone === 'home-collection') {
      if (key === 37) { focusElement(currentNav()); }
      else if (key === 38 || key === 39) { focusElement(document.getElementById('profile-button')); }
      else if (key === 40) { focusElement(homeCards(homeRails[0])[0] || homeCards(homeRails[1])[0] || homeCards(homeRails[2])[0] || currentNav()); }
    } else if (zone === 'home-resume' || zone === 'home-latest' || zone === 'home-recent') {
      var railIndex = zone === 'home-resume' ? 0 : (zone === 'home-latest' ? 1 : 2);
      var rail = homeRails[railIndex];
      cards = homeCards(rail); index = indexOfNode(cards, focused);
      if (key === 37 && index === 0 && rail.start > 0) { loadHomeRail(rail, Math.max(0, rail.start - 5), 4); }
      else if (key === 37) { focusElement(index > 0 ? cards[index - 1] : currentNav()); }
      else if (key === 39 && index === cards.length - 1 && rail.start + cards.length < rail.total) { loadHomeRail(rail, rail.start + 5, 0); }
      else if (key === 39) { focusElement(cards[Math.min(index + 1, cards.length - 1)]); }
      else if (key === 38 || key === 40) {
        var step = key === 38 ? -1 : 1;
        var next = railIndex + step;
        while (next >= 0 && next < homeRails.length && !homeCards(homeRails[next]).length) { next += step; }
        if (next >= 0 && next < homeRails.length) { var otherCards = homeCards(homeRails[next]); focusElement(otherCards[Math.min(index, otherCards.length - 1)]); }
        else if (key === 38) { focusElement(suggestedCollection ? document.getElementById('home-collection') : (suggestedActor ? document.getElementById('home-actor') : document.getElementById('profile-button'))); }
      }
    } else if (zone === 'hero') {
      if (key === 37 && indexOfNode(nodesForZone('hero'), focused) === 0) { focusElement(currentNav()); }
      else if (key === 37) { moveWithin('hero', -1); }
      else if (key === 39) { moveWithin('hero', 1); }
      else if (key === 38) { focusElement(document.getElementById('profile-button')); }
      else if (key === 40) { focusElement(activeCards()[0]); }
    } else if (zone === 'cards') {
      cards = activeCards();
      index = indexOfNode(cards, focused);
      if (key === 37) {
        if (isConnected() && page === 'suche' && !searchActorId && index === 0 && peopleStart > 0) { if (seriesContext) { loadSeriesChildren(Math.max(0, peopleStart - 5), true); } else { searchPeople(Math.max(0, peopleStart - 5), true); } }
        else { focusElement(index > 0 ? cards[index - 1] : currentNav()); }
      }
      else if (key === 39) {
        if (isConnected() && page === 'suche' && !searchActorId && index === cards.length - 1 && peopleStart + cards.length < peopleTotal) { if (seriesContext) { loadSeriesChildren(peopleStart + 5, false); } else { searchPeople(peopleStart + 5, false); } }
        else if (isConnected() && isMoviePage() && index === cards.length - 1 && movieStart + movieItems.length < movieTotal && !movieNeedsRefresh) { loadMovies(movieStart + 5, 0); }
        else { focusElement(cards[Math.min(index + 1, cards.length - 1)]); }
      }
      else if (key === 38 && isConnected() && isMoviePage() && movieStart > 0 && !movieNeedsRefresh) { loadMovies(Math.max(0, movieStart - 5), index); }
      else if (key === 38) { var cardFilters = nodesForZone('favorites-filter'); focusElement(page === 'start' ? nodesForZone('hero')[0] : (seriesContext ? document.getElementById('actor-back') : (page === 'suche' && !searchActorId ? searchInput : (searchActorId ? document.getElementById('actor-back') : (cardFilters.length ? cardFilters[0] : document.getElementById('profile-button')))))); }
      else if (key === 40 && isConnected() && isMoviePage() && movieStart + movieItems.length < movieTotal && !movieNeedsRefresh) { loadMovies(movieStart + 5, index); }
      else if (key === 40 && page === 'entdecken') { focusElement(nodesForZone('people')[0]); }
    } else if (zone === 'people') {
      if (key === 37 && indexOfNode(nodesForZone('people'), focused) === 0) { focusElement(currentNav()); }
      else if (key === 37) { moveWithin('people', -1); }
      else if (key === 39) { moveWithin('people', 1); }
      else if (key === 38) { focusElement(activeCards()[0]); }
    } else if (zone === 'search') {
      if (key === 39 && isConnected()) {
        try {
          if (typeof searchInput.selectionStart === 'number' && typeof searchInput.selectionEnd === 'number' && searchInput.selectionStart < searchInput.value.length) { return false; }
        } catch (ignoreSelection) {}
        focusElement(document.getElementById('search-mode'));
      }
      else if (key === 37 || key === 39) { return false; }
      if (key === 38) { focusElement(document.getElementById('profile-button')); }
      else if (key === 40) { focusElement(activeCards()[0] || currentNav()); }
    } else if (zone === 'favorites-filter') {
      if (key === 37 && indexOfNode(nodesForZone('favorites-filter'), focused) === 0) { focusElement(currentNav()); }
      else if (key === 37) { moveWithin('favorites-filter', -1); }
      else if (key === 39 && indexOfNode(nodesForZone('favorites-filter'), focused) === nodesForZone('favorites-filter').length - 1) { focusElement(document.getElementById('profile-button')); }
      else if (key === 39) { moveWithin('favorites-filter', 1); }
      else if (key === 38) { focusElement(document.getElementById('profile-button')); }
      else if (key === 40) { focusElement(activeCards()[0] || currentNav()); }
    } else if (zone === 'search-mode') {
      if (key === 37 && focused.id === 'series-search') { focusElement(document.getElementById('search-mode')); }
      else if (key === 37) { focusElement(searchInput); }
      else if (key === 39 && focused.id === 'search-mode' && seriesEnabled()) { focusElement(document.getElementById('series-search')); }
      else if (key === 40) { focusElement(activeCards()[0] || searchInput); }
      else if (key === 38) { focusElement(document.getElementById('profile-button')); }
    }
    return true;
  }

  document.addEventListener('focus', function (event) {
    if (event.target && event.target.getAttribute('data-zone')) {
      if (focused !== event.target) { removeClass(focused, 'is-focused'); }
      focused = event.target;
      addClass(focused, 'is-focused');
    }
  }, true);

  document.addEventListener('click', function (event) {
    var target = event.target;
    while (target && target !== document && !target.getAttribute('data-action') && !target.getAttribute('data-page')) { target = target.parentNode; }
    if (target && target !== document) { focusElement(target); activate(target); }
  });

  try { if (window.tizen && window.tizen.tvinputdevice) { window.tizen.tvinputdevice.registerKey('MediaFastForward'); window.tizen.tvinputdevice.registerKey('MediaRewind'); } } catch (ignoreRemoteRegistration) {}

  document.addEventListener('keydown', function (event) {
    var key = event.keyCode || event.which;
    var modalNodes;
    var modalIndex;
    var previousFocus;
    var started;
    var frame;
    if (modal === 'login') {
      if (key === 9) { moveWithin('login', event.shiftKey ? -1 : 1); event.preventDefault(); return; }
      if (key === 38 || key === 40) { moveWithin('login', key === 38 ? -1 : 1); event.preventDefault(); return; }
      if (key === 13 && event.target && event.target.tagName === 'INPUT') { event.preventDefault(); if (event.target.id === 'login-server-input') { saveLoginServer(); } else if (event.target.id === 'login-user') { focusElement(document.getElementById('login-password')); } else { submitLogin(); } return; }
      if (key === 10009 || key === 27) { event.preventDefault(); return; }
    }
    if (modal === 'player') {
      if (seekRate && (key === 13 || key === 10009 || key === 27 || key === 8 || key === 415 || key === 19 || key === 10252)) { event.preventDefault(); stopFastSeek('Spulen beendet.'); return; }
      if (clipSelection) {
        if (key===10009 || key===27 || key===8) { event.preventDefault();closeClipSelection();return; }
        if (key===37 || key===39) { var nowKey=new Date().getTime(),step;event.preventDefault();if(key===clipLastKey && nowKey-clipLastKeyTime<350){clipKeyRepeats+=1;}else{clipKeyRepeats=0;}clipLastKey=key;clipLastKeyTime=nowKey;step=clipKeyRepeats>=6?10:1;clipSelection.move(key===37?-step:step);clipSeekDirty=true;renderClipSelection();if(clipSeekTimer!==null){window.clearTimeout(clipSeekTimer);}clipSeekTimer=window.setTimeout(seekClipPosition,150);return; }
        if (key===38 || key===40) { event.preventDefault();focusElement(document.getElementById(key===40 && clipSelection.snapshot().ready?'clip-save':'clip-mark'));return; }
        if (key===415 || key===19 || key===10252) { event.preventDefault();return; }
      }
      if (clipRestorePending && (key===415 || key===19 || key===10252 || key===13)) { event.preventDefault();return; }
      if ((key === 417 || key === 412) && !clipSelection && !clipRestorePending && !playerTrackMenu) { event.preventDefault(); if (!event.repeat) { remoteFastSeek(key === 417 ? 1 : -1); } return; }
      if (playerTrackMenu) {
        if (key === 10009 || key === 27 || key === 8) { event.preventDefault(); closeTrackMenu(); return; }
        if (key >= 37 && key <= 40) {
          event.preventDefault(); moveWithin('tracks', key === 38 || key === 37 ? -1 : 1);
          if (focused && focused.parentNode === document.getElementById('track-list')) { document.getElementById('track-list').scrollTop = Math.max(0, focused.offsetTop - document.getElementById('track-list').offsetTop - 100); }
          return;
        }
      }
      var playerControlsHidden = document.querySelector('.player-controls').style.display === 'none';
      playerControls();
      if (playerControlsHidden && (key === 37 || key === 39)) { event.preventDefault(); if (!seekBy(key === 39 ? 10 : -10)) { document.getElementById('player-status').textContent = 'Springen nicht verfügbar.'; } return; }
      if (playerControlsHidden && key >= 37 && key <= 40) { event.preventDefault(); return; }
      if (key === 10009 || key === 27 || key === 8 || key === 413) { event.preventDefault(); stopPlayer(); return; }
      if (key === 415 || key === 19 || key === 10252) {
        event.preventDefault();
        if (playerController && ((key === 415 && playerController.getState() === 'paused') || (key === 19 && playerController.getState() === 'playing') || key === 10252)) { activate(document.getElementById('player-toggle')); }
        return;
      }
      if (key >= 37 && key <= 40) {
        if (key===38 && playerController && playerController.getState()==='paused' && document.getElementById('clip-entry').style.display!=='none') { focusElement(document.getElementById('clip-entry')); }
        else if (key===40 && focused===document.getElementById('clip-entry')) { focusElement(document.getElementById('player-toggle')); }
        else if (key === 37 || key === 39) { moveWithin('player', key === 37 ? -1 : 1); }
        event.preventDefault(); return;
      }
    }
    if (key === 9 && modal) {
      modalNodes = nodesForZone(modal);
      modalIndex = indexOfNode(modalNodes, focused);
      if (modalIndex < 0) { modalIndex = 0; }
      focusElement(modalNodes[(modalIndex + (event.shiftKey ? -1 : 1) + modalNodes.length) % modalNodes.length]);
      event.preventDefault();
    } else if (key >= 37 && key <= 40) {
      previousFocus = focused;
      started = diagnostics ? diagnostics.now() : 0;
      if (move(key)) { event.preventDefault(); }
      if (diagnostics && previousFocus !== focused) {
        diagnostics.record('focus-dom', diagnostics.now() - started);
        frame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
        if (typeof frame === 'function') { frame.call(window, function () { diagnostics.record('focus-frame-callback', diagnostics.now() - started); }); }
      }
    } else if (key === 13) {
      if (event.target && event.target.tagName === 'INPUT') { return; }
      event.preventDefault();
      clearPressed();
      pressed = focused;
      addClass(pressed, 'is-pressed');
      activate(focused);
    } else if (key === 10009 || key === 27 || (key === 8 && (!event.target || event.target.tagName !== 'INPUT'))) {
      event.preventDefault();
      if (modal === 'reading') { activate(document.getElementById('reading-close')); }
      else if (modal === 'clip-list') { closeClipList(); }
      else if (modal === 'genre-modal') { closeGenreFilter(); }
      else if (modal === 'collection-actor') { closeCollectionActor(); }
      else if (modal === 'connection') { closeConnection(); }
      else if (modal === 'detail') { closeDetail(); }
      else if (page === 'suche' && seriesContext) { backSeries(); }
      else if (page === 'suche' && searchActorId) { backToPeople(); }
      else if (page === 'sammlungen' && collectionId) { backToCollections(); }
      else if (page === 'filme' && focused && focused.getAttribute('data-zone') === 'cards') { focusElement(currentNav()); }
      else if (page !== 'start') { setPage('start'); }
      else { focusElement(currentNav()); }
    }
  });

  document.addEventListener('keyup', function (event) { if ((event.keyCode || event.which) === 13) { clearPressed(); } });
  window.addEventListener('blur', clearPressed);
  window.addEventListener('unload', function () {
    if(clipJobTimer!==null){window.clearTimeout(clipJobTimer);clipJobTimer=null;}if(clipJobRequest){clipJobRequest.abort();clipJobRequest=null;}if(clipCreateRequest){clipCreateRequest.abort();clipCreateRequest=null;}if(clipRequest){clipRequest.abort();clipRequest=null;}
    cancelCollectionActorSearch();
    cancelLoginQuick();
    if (phoneBridge) { phoneBridge.close(); phoneBridge = null; }
    if (modal === 'player') { stopPlayer(); }
    cancelRequest();
    abortPeople();
    cancelDetailRequests();
    closeAuth();
    abortMovies();
    if (motionPreference && motionPreferenceHandler) {
      try {
        if (typeof motionPreference.removeEventListener === 'function') { motionPreference.removeEventListener('change', motionPreferenceHandler); }
        else if (typeof motionPreference.removeListener === 'function') { motionPreference.removeListener(motionPreferenceHandler); }
      } catch (error) {}
    }
  });
  searchInput.oninput = function () { if (page === 'suche') { if (isConnected() && !searchActorId) { peopleStart = 0; peopleTotal = 0; searchPeople(); } else if (!isConnected()) { renderSection(); } } };
  document.getElementById('auth-user').oninput = function () { fillSavedPassword(); };
  document.getElementById('collection-actor-search').oninput = function () { actorBrowseStart = 0; searchCollectionActors(); };
  document.getElementById('login-user').oninput = function () { cancelRestore(); document.getElementById('login-password').value = ''; };
  document.getElementById('login-password').oninput = function () { cancelRestore(); };
  (function () {
    var loginInputs = [document.getElementById('login-user'), document.getElementById('login-password'), document.getElementById('login-server-input')], i;
    function editStart() { addClass(document.getElementById('login-view'), 'is-editing'); }
    function editEnd() { window.setTimeout(function () { var active = document.activeElement; if (!active || (active.id !== 'login-user' && active.id !== 'login-password' && active.id !== 'login-server-input')) { removeClass(document.getElementById('login-view'), 'is-editing'); fitViewport(); } }, 0); }
    for (i = 0; i < loginInputs.length; i += 1) { loginInputs[i].addEventListener('focus', editStart, false); loginInputs[i].addEventListener('blur', editEnd, false); }
  }());
  serverInput.oninput = function () {
    cancelRestore();
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
    if (rememberedConnection && rememberedConnection.username) {
      document.getElementById('auth-user').value = rememberedConnection.server === base ? rememberedConnection.username : '';
    }
    fillSavedPassword();
    updateAuthWarning();
    if (authRequest) {
      authRevision += 1; authRequest.abort(); authRequest = null;
      document.getElementById('auth-password').value = '';
      document.getElementById('auth-user').readOnly = false;
      document.getElementById('auth-password').readOnly = false;
      setConnectionStatus('', 'Adresse geändert. Bitte erneut anmelden.');
    }
    else if (request) { cancelRequest('Adresse geändert. Bitte erneut prüfen.'); }
    else { setConnectionStatus('', 'Noch nicht verbunden'); }
  };
  initializeConnection();
  initializeMotion();
  applyBranding();
  renderCards(document.getElementById('home-cards'), [0, 1, 2, 3, 4]);
  window.onresize = fitViewport;
  window.onload = function () { fitViewport(); if (previewMode) { focusElement(currentNav()); restoreSavedSession(); } else { showLogin(); if (!restoreSavedSession()) { startLoginQuick(); } else { loginStatus('Anmeldung wird geprüft …'); } } };
}());
