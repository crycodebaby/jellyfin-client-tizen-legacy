(function (root) {
  'use strict';

  function normalizeAddress(address) {
    var base = String(address || '').replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
    if (!/^https?:\/\/[^\s\/@?#]+(?:\/[^\s?#]*)?$/i.test(base) || /[\x00-\x1f\x7f]/.test(base)) { throw new Error('invalid-address'); }
    return base;
  }

  function create(address) {
    var base = normalizeAddress(address);
    var token = null;
    var userId = null;
    var generation = 0;
    var pending = [];
    var deviceId = '';
    var quickSecret = '';
    var quickAuthorized = false;
    var rankedActorCache = null;

    function header(currentToken) {
      return 'MediaBrowser Client="Smairys%20Mediathek", Device="Samsung%20TV", DeviceId="' + encodeURIComponent(deviceId) + '", Version="0.1.0"' +
        (currentToken ? ', Token="' + encodeURIComponent(currentToken) + '"' : '');
    }

    function cancelPending() {
      var old = pending;
      var i;
      pending = [];
      for (i = 0; i < old.length; i += 1) { old[i].handle.abort(); }
    }

    function reset() {
      generation += 1;
      token = null;
      userId = null;
      quickSecret = '';
      quickAuthorized = false;
      rankedActorCache = null;
      cancelPending();
    }

    function send(options, callback) {
      var revision = generation;
      var handle;
      var i;
      var completed = false;
      var entry = { handle: null, callback: callback };
      var invalidated;
      var invalidatedGeneration;
      handle = root.SMAIRYS_HTTP.request(options, function (error, result) {
        completed = true;
        for (i = 0; i < pending.length; i += 1) {
          if (pending[i] === entry) { pending.splice(i, 1); break; }
        }
        if (revision !== generation || entry.cancelled) { return; }
        if (error && error.type === 'http' && error.status === 401 && token && !options.preserveSessionOn401) {
          invalidated = pending.slice(0);
          reset();
          invalidatedGeneration = generation;
          callback({ type: 'unauthorized', status: 401 });
          for (i = 0; i < invalidated.length && generation === invalidatedGeneration; i += 1) {
            if (!invalidated[i].cancelled) { invalidated[i].callback({ type: 'unauthorized', status: 401 }); }
          }
          return;
        }
        callback(error, result);
      });
      entry.handle = handle;
      if (!completed) { pending.push(entry); }
      return {
        abort: function () {
          entry.cancelled = true;
          handle.abort();
          for (i = 0; i < pending.length; i += 1) {
            if (pending[i] === entry) { pending.splice(i, 1); break; }
          }
        }
      };
    }

    function login(username, password, callback) {
      if (token) { logout(); } else { reset(); }
      // A new device identifier prevents a previous session's logout racing a new login.
      deviceId = 'smairys-' + String(new Date().getTime()) + '-' + String(Math.floor(Math.random() * 1000000000));
      return send({ method: 'POST', url: base + '/Users/AuthenticateByName',
        headers: { Authorization: header(null), 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: username, Pw: password }) }, function (error, data) {
        if (error) { callback(error); return; }
        if (!data || typeof data.AccessToken !== 'string' || !data.AccessToken || !data.User || !validId(data.User.Id) || /["\\\x00-\x1f\x7f]/.test(data.AccessToken)) {
          callback({ type: 'parse' }); return;
        }
        token = data.AccessToken;
        userId = data.User.Id;
        callback(null, { userId: userId, name: typeof data.User.Name === 'string' ? data.User.Name : '' });
      });
    }

    // The pairing secret remains in this closure; only the short code is exposed to the UI.
    function beginQuickConnect(callback) {
      if (token) { return failLater('arguments', callback); }
      reset();
      deviceId = 'smairys-' + String(new Date().getTime()) + '-' + String(Math.floor(Math.random() * 1000000000));
      return send({ method: 'POST', url: base + '/QuickConnect/Initiate', headers: { Authorization: header(null) } }, function (error, data) {
        if (error) { callback(error); return; }
        if (!data || typeof data.Code !== 'string' || !/^[A-Za-z0-9]{6}$/.test(data.Code) || typeof data.Secret !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/.test(data.Secret) || data.Authenticated !== false) { callback({ type: 'parse' }); return; }
        quickSecret = data.Secret; quickAuthorized = false;
        callback(null, { code: data.Code });
      });
    }

    function pollQuickConnect(callback) {
      var secret = quickSecret;
      if (!secret || token) { return failLater('unavailable', callback); }
      return send({ url: base + '/QuickConnect/Connect?secret=' + encodeURIComponent(secret), headers: { Authorization: header(null) } }, function (error, data) {
        if (error) { callback(error); return; }
        if (!data || typeof data.Authenticated !== 'boolean' || (data.Secret != null && data.Secret !== secret)) { callback({ type: 'parse' }); return; }
        quickAuthorized = data.Authenticated;
        callback(null, { authenticated: quickAuthorized });
      });
    }

    function finishQuickConnect(callback) {
      var secret = quickSecret;
      if (!secret || !quickAuthorized || token) { return failLater('unavailable', callback); }
      return send({ method: 'POST', url: base + '/Users/AuthenticateWithQuickConnect', headers: { Authorization: header(null), 'Content-Type': 'application/json' }, body: JSON.stringify({ Secret: secret }) }, function (error, data) {
        if (error) { callback(error); return; }
        if (!data || typeof data.AccessToken !== 'string' || !data.AccessToken || data.AccessToken.length > 4096 || !data.User || !validId(data.User.Id) || /["\\\x00-\x1f\x7f]/.test(data.AccessToken)) { callback({ type: 'parse' }); return; }
        token = data.AccessToken; userId = data.User.Id; quickSecret = ''; quickAuthorized = false;
        callback(null, { userId: userId, name: typeof data.User.Name === 'string' ? data.User.Name : '' });
      });
    }

    function cancelQuickConnect() { if (!token) { reset(); } }

    // The caller chooses how and whether to store this sensitive bearer credential.
    function exportSession() { return token && userId && deviceId ? { token: token, userId: userId, deviceId: deviceId } : null; }

    function restoreSession(session, callback) {
      if (token || !session || typeof session.token !== 'string' || !session.token || session.token.length > 4096 || /["\\\x00-\x1f\x7f]/.test(session.token) || !validId(session.userId) || typeof session.deviceId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(session.deviceId)) { return failLater('arguments', callback); }
      reset(); deviceId = session.deviceId;
      var candidateToken = session.token, candidateUser = session.userId;
      return send({ url: base + '/Users/' + encodeURIComponent(candidateUser), headers: { Authorization: header(candidateToken) }, preserveSessionOn401: true }, function (error, data) {
        if (error) { if (error.type === 'http' && (error.status === 401 || error.status === 403)) { callback({ type: 'invalid-session', status: error.status }); } else { callback(error); } return; }
        if (!data || data.Id !== candidateUser) { callback({ type: 'parse' }); return; }
        token = candidateToken; userId = candidateUser;
        callback(null, { userId: userId, name: typeof data.Name === 'string' ? data.Name : '' });
      });
    }

    function movies(start, limit, callback) {
      var url;
      var timer;
      var revision = generation;
      if (!token) { timer = root.setTimeout(function () { if (revision === generation) { callback({ type: 'unauthorized' }); } }, 0); return { abort: function () { root.clearTimeout(timer); } }; }
      if (typeof start !== 'number' || start < 0 || start % 1 || typeof limit !== 'number' || limit < 1 || limit > 100 || limit % 1) {
        timer = root.setTimeout(function () { if (revision === generation) { callback({ type: 'arguments' }); } }, 0); return { abort: function () { root.clearTimeout(timer); } };
      }
      url = base + '/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&recursive=true&sortBy=SortName&sortOrder=Ascending&startIndex=' + start + '&limit=' + limit + '&fields=Overview';
      return send({ url: url, headers: { Authorization: header(token) } }, function (error, data) {
        var result = [];
        var i;
        var item;
        var image;
        var backdrop;
        var progress;
        if (error) { callback(error); return; }
        if (!data || !Array.isArray(data.Items) || typeof data.TotalRecordCount !== 'number' || data.TotalRecordCount < 0 || data.TotalRecordCount % 1 || data.StartIndex !== start || data.Items.length > limit) {
          callback({ type: 'parse' }); return;
        }
        for (i = 0; i < data.Items.length; i += 1) {
          item = data.Items[i];
          if (!item || typeof item.Id !== 'string' || !item.Id || typeof item.Name !== 'string') { callback({ type: 'parse' }); return; }
          image = item.ImageTags && typeof item.ImageTags.Primary === 'string' ? base + '/Items/' + encodeURIComponent(item.Id) + '/Images/Primary?maxWidth=360&tag=' + encodeURIComponent(item.ImageTags.Primary) : '';
          backdrop = Array.isArray(item.BackdropImageTags) && typeof item.BackdropImageTags[0] === 'string' && item.BackdropImageTags[0] ? base + '/Items/' + encodeURIComponent(item.Id) + '/Images/Backdrop/0?maxWidth=1280&tag=' + encodeURIComponent(item.BackdropImageTags[0]) : '';
          progress = movieModel(item) || {};
          result.push({ id: item.Id, title: item.Name, description: typeof item.Overview === 'string' ? item.Overview : '', imageUrl: image, backdropUrl: backdrop,
            year: progress.year || null, durationSeconds: progress.durationSeconds || 0, positionSeconds: progress.positionSeconds || 0,
            playedPercentage: progress.playedPercentage || 0, isPlayed: progress.isPlayed === true });
        }
        callback(null, { items: result, total: data.TotalRecordCount, start: start });
      });
    }

    function validId(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id); }
    function failLater(type, callback) {
      var revision = generation;
      var timer = root.setTimeout(function () { if (revision === generation) { callback({ type: type }); } }, 0);
      return { abort: function () { root.clearTimeout(timer); } };
    }
    function imageUrl(id, tag, width) {
      return validId(id) && typeof tag === 'string' && tag ? base + '/Items/' + encodeURIComponent(id) + '/Images/Primary?maxWidth=' + width + '&tag=' + encodeURIComponent(tag) : '';
    }
    function movieModel(item) {
      var duration, position, percent, userData, genres, i;
      if (!item || !validId(item.Id) || typeof item.Name !== 'string') { return null; }
      userData = item.UserData || {};
      duration = typeof item.RunTimeTicks === 'number' && isFinite(item.RunTimeTicks) && item.RunTimeTicks > 0 ? item.RunTimeTicks / 10000000 : 0;
      position = typeof userData.PlaybackPositionTicks === 'number' && isFinite(userData.PlaybackPositionTicks) && userData.PlaybackPositionTicks > 0 ? userData.PlaybackPositionTicks / 10000000 : 0;
      percent = typeof userData.PlayedPercentage === 'number' && isFinite(userData.PlayedPercentage) && userData.PlayedPercentage >= 0 && userData.PlayedPercentage <= 100 ? userData.PlayedPercentage : 0;
      if (userData.PlayedPercentage == null && duration > 0 && position > 0) { percent = Math.min(100, position / duration * 100); }
      genres = [];
      if (Array.isArray(item.Genres)) { for (i = 0; i < item.Genres.length && genres.length < 2; i += 1) { if (typeof item.Genres[i] === 'string' && item.Genres[i]) { genres.push(item.Genres[i].substring(0, 60)); } } }
      return { id: item.Id, title: item.Name, description: typeof item.Overview === 'string' ? item.Overview : '',
        imageUrl: imageUrl(item.Id, item.ImageTags && item.ImageTags.Primary, 360),
        backdropUrl: Array.isArray(item.BackdropImageTags) && typeof item.BackdropImageTags[0] === 'string' && item.BackdropImageTags[0] ? base + '/Items/' + encodeURIComponent(item.Id) + '/Images/Backdrop/0?maxWidth=1280&tag=' + encodeURIComponent(item.BackdropImageTags[0]) : '',
        year: typeof item.ProductionYear === 'number' && item.ProductionYear >= 1880 && item.ProductionYear <= 9999 ? item.ProductionYear : null, genres: genres,
        isFavorite: userData.IsFavorite === true, durationSeconds: duration, positionSeconds: position,
        playedPercentage: percent, isPlayed: userData.Played === true };
    }
    function movieDetails(id, callback) {
      if (!token || !validId(id)) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return send({ url: base + '/Users/' + encodeURIComponent(userId) + '/Items/' + encodeURIComponent(id), headers: { Authorization: header(token) } }, function (error, data) {
        var model, person, i;
        if (error) { callback(error); return; }
        model = movieModel(data);
        if (!model || model.id !== id || (data.People != null && !Array.isArray(data.People))) { callback({ type: 'parse' }); return; }
        model.resumeSeconds = 0;
        if (data.UserData && typeof data.UserData.PlaybackPositionTicks === 'number' && isFinite(data.UserData.PlaybackPositionTicks) && data.UserData.PlaybackPositionTicks > 0 && typeof data.RunTimeTicks === 'number' && isFinite(data.RunTimeTicks) && data.RunTimeTicks > data.UserData.PlaybackPositionTicks && data.UserData.PlaybackPositionTicks <= 21474836470000) {
          model.resumeSeconds = data.UserData.PlaybackPositionTicks / 10000000;
        }
        model.people = [];
        for (i = 0; i < (data.People || []).length; i += 1) {
          person = data.People[i];
          if (!person || person.Type !== 'Actor' || !validId(person.Id) || typeof person.Name !== 'string') { continue; }
          model.people.push({ id: person.Id, name: person.Name, role: typeof person.Role === 'string' ? person.Role : '', imageUrl: imageUrl(person.Id, person.PrimaryImageTag, 240) });
        }
        callback(null, model);
      });
    }
    function localTrailers(id, callback) {
      if (!token || !validId(id)) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return send({ url: base + '/Items/' + encodeURIComponent(id) + '/LocalTrailers?userId=' + encodeURIComponent(userId), headers: { Authorization: header(token) } }, function (error, data) {
        var result = [], i, item;
        if (error) { callback(error); return; }
        if (!Array.isArray(data)) { callback({ type: 'parse' }); return; }
        for (i = 0; i < data.length && i < 20; i += 1) {
          item = data[i];
          if (item && item.Type === 'Trailer' && validId(item.Id) && item.Id !== id) { result.push({ id: item.Id }); }
        }
        callback(null, result);
      });
    }
    function personDetails(id, callback) {
      if (!token || !validId(id)) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return send({ url: base + '/Users/' + encodeURIComponent(userId) + '/Items/' + encodeURIComponent(id), headers: { Authorization: header(token) } }, function (error, data) {
        if (error) { callback(error); return; }
        if (!data || data.Id !== id || typeof data.Name !== 'string') { callback({ type: 'parse' }); return; }
        callback(null, { id: id, name: data.Name, imageUrl: imageUrl(id, data.ImageTags && data.ImageTags.Primary, 480), born: typeof data.PremiereDate === 'string' ? data.PremiereDate : '', died: typeof data.EndDate === 'string' ? data.EndDate : '', birthplace: typeof data.ProductionLocations === 'object' && Array.isArray(data.ProductionLocations) ? data.ProductionLocations[0] || '' : '', overview: typeof data.Overview === 'string' ? data.Overview : '' });
      });
    }
    function pageRequest(path, start, limit, people, callback) {
      if (!token) { return failLater('unauthorized', callback); }
      if (typeof start !== 'number' || !isFinite(start) || start < 0 || start % 1 || typeof limit !== 'number' || limit < 1 || limit > 100 || limit % 1) { return failLater('arguments', callback); }
      return send({ url: base + path + '&startIndex=' + start + '&limit=' + limit, headers: { Authorization: header(token) } }, function (error, data) {
        var result = [], item, model, i;
        if (error) { callback(error); return; }
        if (!data || !Array.isArray(data.Items) || typeof data.TotalRecordCount !== 'number' || !isFinite(data.TotalRecordCount) || data.TotalRecordCount < 0 || data.TotalRecordCount % 1 || data.StartIndex !== start || data.Items.length > limit) { callback({ type: 'parse' }); return; }
        for (i = 0; i < data.Items.length; i += 1) {
          item = data.Items[i];
          model = people ? (item && validId(item.Id) && typeof item.Name === 'string' ? { id: item.Id, name: item.Name, imageUrl: imageUrl(item.Id, item.ImageTags && item.ImageTags.Primary, 240) } : null) : movieModel(item);
          if (!model) { callback({ type: 'parse' }); return; }
          result.push(model);
        }
        callback(null, { items: result, total: data.TotalRecordCount, start: start });
      });
    }
    function searchPeople(term, start, limit, callback) {
      if (!token || typeof term !== 'string' || !term.replace(/\s/g, '') || term.length > 200) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return pageRequest('/Persons?userId=' + encodeURIComponent(userId) + '&personTypes=Actor&searchTerm=' + encodeURIComponent(term), start, limit, true, callback);
    }
    function browseActors(start, limit, callback) {
      return pageRequest('/Persons?userId=' + encodeURIComponent(userId) + '&personTypes=Actor&sortBy=SortName&sortOrder=Ascending', start, limit, true, callback);
    }
    function rankedMovieActors(callback) {
      if (!token) { return failLater('unauthorized', callback); }
      var sessionToken = token;
      if (rankedActorCache && rankedActorCache.token === sessionToken && Date.now() - rankedActorCache.time < 300000) {
        var cached = rankedActorCache.people;
        var timer = window.setTimeout(function () { callback(null, cached); }, 0);
        return { abort: function () { window.clearTimeout(timer); } };
      }
      var path = '/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&recursive=true&fields=People&enableUserData=false&enableImages=false&sortBy=SortName';
      var byId = Object.create(null), films = Object.create(null), actors = [];
      var request, cancelled = false, hasCredits = false;
      function readPage(start) {
        request = send({ url: base + path + '&startIndex=' + start + '&limit=100', headers: { Authorization: header(sessionToken) } }, function (error, data) {
          var i, j, film, person, actor, credits, next;
          if (cancelled) { return; }
          if (error) { callback(error); return; }
          if (sessionToken !== token) { return; }
          if (!data || data.StartIndex !== start || !Array.isArray(data.Items) || data.Items.length > 100 ||
              !isFinite(data.TotalRecordCount) || typeof data.TotalRecordCount !== 'number' ||
              data.TotalRecordCount < 0 || data.TotalRecordCount % 1 || (!data.Items.length && start < data.TotalRecordCount)) {
            callback({ type: 'parse' }); return;
          }
          for (i = 0; i < data.Items.length; i += 1) {
            film = data.Items[i];
            if (!film || !validId(film.Id) || films[film.Id]) { continue; }
            films[film.Id] = true;
            if (!Array.isArray(film.People)) { continue; }
            hasCredits = true;
            credits = Object.create(null);
            for (j = 0; j < film.People.length; j += 1) {
              person = film.People[j];
              if (!person || person.Type !== 'Actor' || !validId(person.Id) || typeof person.Name !== 'string' || credits[person.Id]) { continue; }
              credits[person.Id] = true;
              actor = byId[person.Id];
              if (!actor) {
                actor = { id: person.Id, name: person.Name, count: 0, imageUrl: '' };
                byId[person.Id] = actor;
                actors.push(actor);
              }
              actor.count += 1;
              if (!actor.imageUrl) { actor.imageUrl = imageUrl(person.Id, person.PrimaryImageTag, 520); }
            }
          }
          next = start + data.Items.length;
          if (next < data.TotalRecordCount) { readPage(next); return; }
          if (next && !hasCredits) { callback({ type: 'parse' }); return; }
          actors.sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id); });
          rankedActorCache = { token: sessionToken, time: Date.now(), people: actors };
          callback(null, actors);
        });
      }
      readPage(0);
      return { abort: function () { cancelled = true; if (request) { request.abort(); } } };
    }
    function searchMovies(term, start, limit, callback) {
      if (!token || typeof term !== 'string' || !term.replace(/\s/g, '') || term.length > 200) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&recursive=true&sortBy=SortName&sortOrder=Ascending&fields=Overview&searchTerm=' + encodeURIComponent(term), start, limit, false, callback);
    }
    function searchSeries(term, start, limit, callback) {
      if (!token || typeof term !== 'string' || !term.replace(/\s/g, '') || term.length > 200) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Series&recursive=true&sortBy=SortName&sortOrder=Ascending&fields=Overview&searchTerm=' + encodeURIComponent(term), start, limit, false, callback);
    }
    function seriesChildren(parentId, type, start, limit, callback) {
      if (!token || !validId(parentId) || (type !== 'Season' && type !== 'Episode')) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&parentId=' + encodeURIComponent(parentId) + '&includeItemTypes=' + type + '&sortBy=IndexNumber,SortName&sortOrder=Ascending&fields=Overview&enableUserData=true', start, limit, false, callback);
    }
    function actorMovies(id, start, limit, callback) {
      if (!token || !validId(id)) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&recursive=true&sortBy=SortName&sortOrder=Ascending&fields=Overview&personTypes=Actor&personIds=' + encodeURIComponent(id), start, limit, false, callback);
    }
    function actorSeries(id, start, limit, callback) {
      if (!token || !validId(id)) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Series&recursive=true&sortBy=SortName&sortOrder=Ascending&fields=Overview&personTypes=Actor&personIds=' + encodeURIComponent(id), start, limit, false, callback);
    }
    function collections(start, limit, callback) {
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=BoxSet&recursive=true&sortBy=SortName&sortOrder=Ascending&fields=Overview', start, limit, false, callback);
    }
    function collectionMovies(id, start, limit, callback) {
      if (!token || !validId(id)) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&parentId=' + encodeURIComponent(id) + '&includeItemTypes=Movie&recursive=true&sortBy=PremiereDate,SortName&sortOrder=Ascending&fields=Overview', start, limit, false, callback);
    }
    function collectionActorMovies(collectionId, actorId, start, limit, callback) {
      if (!token || !validId(collectionId) || !validId(actorId)) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&parentId=' + encodeURIComponent(collectionId) + '&includeItemTypes=Movie&recursive=true&sortBy=PremiereDate,SortName&sortOrder=Ascending&fields=Overview&personTypes=Actor&personIds=' + encodeURIComponent(actorId), start, limit, false, callback);
    }
    function favorites(start, limit, callback, filter) {
      var played = filter === 'played' ? '&isPlayed=true' : (filter === 'unplayed' ? '&isPlayed=false' : '');
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&recursive=true&sortBy=SortName&sortOrder=Ascending&fields=Overview&isFavorite=true' + played, start, limit, false, callback);
    }
    function genres(callback) {
      return pageRequest('/Genres?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&sortBy=SortName&sortOrder=Ascending', 0, 100, true, callback);
    }
    function discoverMovies(start, limit, callback, filter, genreId, sort) {
      return filterMovies(start, limit, callback, { filter: filter, genreIds: genreId ? [genreId] : [], sort: sort });
    }
    function filterMovies(start, limit, callback, options) {
      var suffix = '', ids, years, i, order;
      options = options || {}; ids = options.genreIds || []; years = options.years || [];
      if (!Array.isArray(ids) || ids.length > 20 || (options.parentId && !validId(options.parentId)) || (options.actorId && !validId(options.actorId))) { return failLater('arguments', callback); }
      for (i = 0; i < ids.length; i += 1) { if (!validId(ids[i])) { return failLater('arguments', callback); } }
      if (!Array.isArray(years) || years.length > 220) { return failLater('arguments', callback); }
      for (i = 0; i < years.length; i += 1) { if (typeof years[i] !== 'number' || years[i] % 1 !== 0 || years[i] < 1880 || years[i] > 9999) { return failLater('arguments', callback); } }
      if (ids.length) { suffix += '&genreIds=' + encodeURIComponent(ids.join(',')); }
      if (years.length) { suffix += '&years=' + encodeURIComponent(years.join(',')); }
      if (options.actorId) { suffix += '&personTypes=Actor&personIds=' + encodeURIComponent(options.actorId); }
      if (options.parentId) { suffix += '&parentId=' + encodeURIComponent(options.parentId); }
      if (options.filter === 'played') { suffix += '&isPlayed=true'; } else if (options.filter === 'unplayed') { suffix += '&isPlayed=false'; }
      if (options.filter === 'resumable') { suffix += '&filters=IsResumable'; }
      order = 'SortName&sortOrder=Ascending';
      if (options.parentId) { order = 'PremiereDate,SortName&sortOrder=Ascending'; }
      else if (options.sort === 'added') { order = 'DateCreated&sortOrder=Descending'; }
      else if (options.sort === 'year') { order = 'PremiereDate&sortOrder=Descending'; }
      else if (options.sort === 'oldest') { order = 'ProductionYear,SortName&sortOrder=Ascending'; }
      else if (options.sort === 'newest') { order = 'ProductionYear,SortName&sortOrder=Descending'; }
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&recursive=true&sortBy=' + order + '&fields=Overview&enableUserData=true' + suffix, start, limit, false, callback);
    }
    function latestMovies(start, limit, callback) {
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&recursive=true&sortBy=DateCreated&sortOrder=Descending&fields=Overview&enableUserData=true', start, limit, false, callback);
    }
    function resumeMovies(start, limit, callback) {
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&mediaTypes=Video&recursive=true&filters=IsResumable&sortBy=DatePlayed&sortOrder=Descending&fields=Overview&enableUserData=true', start, limit, false, callback);
    }
    function recentlyPlayedMovies(start, limit, callback) {
      return pageRequest('/Items?userId=' + encodeURIComponent(userId) + '&includeItemTypes=Movie&mediaTypes=Video&recursive=true&isPlayed=true&sortBy=DatePlayed&sortOrder=Descending&fields=Overview&enableUserData=true', start, limit, false, callback);
    }
    function setFavorite(id, favorite, callback) {
      if (!token || !validId(id) || typeof favorite !== 'boolean') { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return send({ method: favorite ? 'POST' : 'DELETE', url: base + '/Users/' + encodeURIComponent(userId) + '/FavoriteItems/' + encodeURIComponent(id), headers: { Authorization: header(token) } }, function (error, data) {
        if (error) { callback(error); return; }
        if (!data || typeof data.IsFavorite !== 'boolean') { callback({ type: 'parse' }); return; }
        callback(null, { isFavorite: data.IsFavorite });
      });
    }

    function authorizeQuickConnect(code, callback) {
      if (!token || typeof code !== 'string' || !/^[A-Za-z0-9]{6}$/.test(code)) {
        return failLater(token ? 'arguments' : 'unauthorized', callback);
      }
      return send({ method: 'POST', url: base + '/QuickConnect/Authorize?code=' + encodeURIComponent(code),
        headers: { Authorization: header(token) }, preserveSessionOn401: true }, function (error, data) {
        if (error) { callback(error); return; }
        if (typeof data !== 'boolean') { callback({ type: 'parse' }); return; }
        callback(null, data);
      });
    }

    // A conservative starting profile; actual codec support still requires TV testing.
    function playbackInfo(itemId, callback, selection) {
      var revision = generation;
      var timer;
      var active;
      var cancelled = false;
      var profile = {
        Name: 'Smairys Tizen', MaxStreamingBitrate: 12000000,
        DirectPlayProfiles: [{ Container: 'mp4', Type: 'Video', VideoCodec: 'h264', AudioCodec: 'aac' }],
        TranscodingProfiles: [{ Container: 'ts', Type: 'Video', VideoCodec: 'h264', AudioCodec: 'aac', Context: 'Streaming', Protocol: 'hls', MaxAudioChannels: '2', MinSegments: 1 }],
        ContainerProfiles: [], CodecProfiles: [], SubtitleProfiles: []
      };
      if (!token || typeof itemId !== 'string' || !itemId || (selection && (!validId(selection.sourceId) || typeof selection.index !== 'number' || !isFinite(selection.index) || selection.index < 0 || selection.index % 1 || selection.index > 2147483647))) {
        timer = root.setTimeout(function () { if (revision === generation) { callback({ type: token ? 'arguments' : 'unauthorized' }); } }, 0);
        return { abort: function () { root.clearTimeout(timer); } };
      }
      function requestPlayback(selection, done) {
        var body = { UserId: userId, MaxStreamingBitrate: 12000000, DeviceProfile: profile };
        if (selection) {
          body.MediaSourceId = selection.sourceId;
          body.AudioStreamIndex = selection.index;
          body.EnableDirectPlay = false;
          body.EnableDirectStream = false;
        }
        return send({ method: 'POST', url: base + '/Items/' + encodeURIComponent(itemId) + '/PlaybackInfo',
          headers: { Authorization: header(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, done);
      }
      function parsePlayback(error, data, requiredSource) {
        var source;
        var url;
        var method;
        var i;
        var origin;
        var basePath;
        var query;
        var params;
        var key;
        var value;
        var keyCount;
        var j;
        var path;
        var hlsPath;
        if (error) { return { error: error }; }
        if (!data || data.ErrorCode || !Array.isArray(data.MediaSources) || typeof data.PlaySessionId !== 'string' || !data.PlaySessionId) { return { error: { type: 'playback-unavailable' } }; }
        for (i = 0; i < data.MediaSources.length; i += 1) {
          source = data.MediaSources[i];
          if (!source || typeof source.Id !== 'string' || !source.Id || source.RequiresOpening || (requiredSource && source.Id !== requiredSource)) { continue; }
          if (!requiredSource && source.SupportsDirectPlay === true) {
            method = 'DirectPlay';
            url = base + '/Videos/' + encodeURIComponent(itemId) + '/stream?static=true&mediaSourceId=' + encodeURIComponent(source.Id) + '&playSessionId=' + encodeURIComponent(data.PlaySessionId) + '&ApiKey=' + encodeURIComponent(token);
            break;
          }
          if (source.SupportsTranscoding === true && typeof source.TranscodingUrl === 'string' && /^\/(?!\/)[^\s\\#]*$/.test(source.TranscodingUrl)) {
            // Never send credentials to another origin or accept an unrelated key.
            query = source.TranscodingUrl.split('?');
            if (query.length > 2) { continue; }
            origin = base.match(/^https?:\/\/[^\/]+/i)[0];
            basePath = base.substring(origin.length);
            path = basePath && query[0].indexOf(basePath + '/') === 0 ? query[0].substring(basePath.length) : query[0];
            hlsPath = /^\/videos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})\/master\.m3u8$/i.exec(path);
            if (/(?:%|\\|\/\.\.?\/)/.test(path) || (path.toLowerCase().indexOf(('/Videos/' + encodeURIComponent(itemId) + '/').toLowerCase()) !== 0 && !(hlsPath && /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(itemId) && hlsPath[1].replace(/-/g, '').toLowerCase() === itemId.replace(/-/g, '').toLowerCase()))) { continue; }
            params = query.length === 2 ? query[1].split('&') : [];
            keyCount = 0;
            try {
              for (j = 0; j < params.length; j += 1) {
                key = params[j].split('=')[0];
                key = decodeURIComponent(key.replace(/\+/g, ' ')).toLowerCase();
                if (key === 'api_key' || key === 'apikey') {
                  keyCount += 1;
                  value = params[j].substring(params[j].indexOf('=') + 1);
                  if (decodeURIComponent(value.replace(/\+/g, ' ')) !== token) { keyCount = 2; break; }
                  params[j] = 'ApiKey=' + encodeURIComponent(token);
                }
              }
            } catch (ignore) { continue; }
            if (keyCount > 1) { continue; }
            path = query[0] + (query.length === 2 ? '?' + params.join('&') : '');
            url = basePath && path.indexOf(basePath + '/') !== 0 ? base + path : origin + path;
            if (!keyCount) { url += (query.length === 2 ? '&' : '?') + 'ApiKey=' + encodeURIComponent(token); }
            method = 'Transcode';
            break;
          }
        }
        if (!url) { return { error: { type: 'playback-unavailable' } }; }
        return { source: source, info: { url: url, itemId: itemId, mediaSourceId: source.Id, playSessionId: data.PlaySessionId, playMethod: method, audioTracks: audioTracks(source), subtitleTracks: subtitleTracks(source), audioStreamIndex: typeof source.DefaultAudioStreamIndex === 'number' ? source.DefaultAudioStreamIndex : null } };
      }
      function subtitleTracks(source) {
        var result = [], streams = source.MediaStreams, stream, i;
        if (!Array.isArray(streams)) { return result; }
        for (i = 0; i < streams.length; i += 1) {
          stream = streams[i];
          if (!stream || stream.Type !== 'Subtitle' || typeof stream.Index !== 'number' || !isFinite(stream.Index) || stream.Index < 0 || stream.Index % 1 || stream.Index > 2147483647) { continue; }
          result.push({ index: stream.Index, language: typeof stream.Language === 'string' ? stream.Language.substring(0, 32) : '', title: typeof stream.DisplayTitle === 'string' ? stream.DisplayTitle.substring(0, 160) : '', text: stream.IsTextSubtitleStream === true });
        }
        return result;
      }
      function audioTracks(source) {
        var result = [];
        var streams = source.MediaStreams;
        var stream;
        var i;
        if (!Array.isArray(streams)) { return result; }
        for (i = 0; i < streams.length; i += 1) {
          stream = streams[i];
          if (!stream || stream.Type !== 'Audio' || typeof stream.Index !== 'number' || !isFinite(stream.Index) || stream.Index < 0 || stream.Index % 1 || stream.Index > 2147483647) { continue; }
          result.push({ index: stream.Index, language: typeof stream.Language === 'string' ? stream.Language.substring(0, 32) : '', title: typeof stream.DisplayTitle === 'string' ? stream.DisplayTitle.substring(0, 160) : '' });
        }
        return result;
      }
      active = requestPlayback(selection || null, function (error, data) {
        var initial = parsePlayback(error, data, selection ? selection.sourceId : null);
        var streams;
        var stream;
        var language;
        var index = null;
        var i;
        if (cancelled) { return; }
        if (initial.error) { callback(initial.error); return; }
        if (selection) {
          if (initial.source.DefaultAudioStreamIndex !== selection.index) { callback({ type: 'playback-unavailable' }); return; }
          initial.info.audioStreamIndex = selection.index;
          callback(null, initial.info); return;
        }
        streams = initial.source.MediaStreams;
        if (initial.info.playMethod === 'Transcode' && Array.isArray(streams)) {
          for (i = 0; i < streams.length; i += 1) {
            stream = streams[i];
            language = stream && typeof stream.Language === 'string' ? stream.Language.toLowerCase().replace(/^\s+|\s+$/g, '') : '';
            if (stream && stream.Type === 'Audio' && /^(de|deu|ger)(?:[-_][a-z0-9]+)*$/.test(language) && typeof stream.Index === 'number' && isFinite(stream.Index) && stream.Index >= 0 && stream.Index % 1 === 0 && stream.Index <= 2147483647) {
              index = stream.Index;
              break;
            }
          }
        }
        if (index === null || index === initial.source.DefaultAudioStreamIndex) { callback(null, initial.info); return; }
        active = requestPlayback({ sourceId: initial.source.Id, index: index }, function (secondError, secondData) {
          var selected;
          if (cancelled) { return; }
          if (secondError && secondError.type === 'unauthorized') { callback(secondError); return; }
          selected = parsePlayback(secondError, secondData, initial.source.Id);
          if (selected.error || selected.source.DefaultAudioStreamIndex !== index) { callback(null, initial.info); return; }
          selected.info.audioTracks = initial.info.audioTracks;
          selected.info.subtitleTracks = initial.info.subtitleTracks;
          selected.info.audioStreamIndex = index;
          callback(null, selected.info);
        });
      });
      return { abort: function () { cancelled = true; if (active) { active.abort(); } } };
    }

    function selectAudio(itemId, mediaSourceId, index, callback) {
      return playbackInfo(itemId, callback, { sourceId: mediaSourceId, index: index });
    }

    // Fetch a text track from the authenticated server; never trust a DeliveryUrl.
    function subtitleText(itemId, mediaSourceId, index, callback) {
      if (!token || !validId(itemId) || !validId(mediaSourceId) || typeof index !== 'number' || !isFinite(index) || index < 0 || index % 1 || index > 2147483647) { return failLater(token ? 'arguments' : 'unauthorized', callback); }
      return send({ method: 'GET', url: base + '/Videos/' + encodeURIComponent(itemId) + '/' + encodeURIComponent(mediaSourceId) + '/Subtitles/' + index + '/Stream.vtt?copyTimestamps=true', headers: { Authorization: header(token) }, responseText: true, timeout: 30000 }, function (error, data) {
        if (error) { callback(error); return; }
        if (typeof data !== 'string' || data.length > 2000000 || !/^\ufeff?WEBVTT(?:[ \t\r\n]|$)/.test(data)) { callback({ type: 'parse' }); return; }
        callback(null, data);
      });
    }

    function reportPlayback(kind, info, positionSeconds, paused, callback) {
      var paths = { start: '/Sessions/Playing', progress: '/Sessions/Playing/Progress', stopped: '/Sessions/Playing/Stopped' };
      var timer;
      var revision = generation;
      callback = callback || function () {};
      if (!token || !Object.prototype.hasOwnProperty.call(paths, kind) || !info || typeof info.itemId !== 'string' || typeof info.mediaSourceId !== 'string' || typeof info.playSessionId !== 'string' || (info.playMethod !== 'DirectPlay' && info.playMethod !== 'Transcode') || typeof positionSeconds !== 'number' || !isFinite(positionSeconds) || positionSeconds < 0 || positionSeconds > 900719925) {
        timer = root.setTimeout(function () { if (revision === generation) { callback({ type: token ? 'arguments' : 'unauthorized' }); } }, 0);
        return { abort: function () { root.clearTimeout(timer); } };
      }
      return send({ method: 'POST', url: base + paths[kind], headers: { Authorization: header(token), 'Content-Type': 'application/json' }, emptyResponse: true,
        body: JSON.stringify({ ItemId: info.itemId, MediaSourceId: info.mediaSourceId, PlaySessionId: info.playSessionId, PlayMethod: info.playMethod, PositionTicks: Math.floor(positionSeconds * 10000000), IsPaused: !!paused, CanSeek: true }) }, callback);
    }

    function logout() {
      var previousToken = token;
      var previousHeader = previousToken ? header(previousToken) : null;
      reset();
      if (previousHeader) {
        root.SMAIRYS_HTTP.request({ method: 'POST', url: base + '/Sessions/Logout', headers: { Authorization: previousHeader }, emptyResponse: true }, function () {});
      }
    }

    return { login: login, beginQuickConnect: beginQuickConnect, pollQuickConnect: pollQuickConnect, finishQuickConnect: finishQuickConnect, cancelQuickConnect: cancelQuickConnect, exportSession: exportSession, restoreSession: restoreSession, movies: movies, movieDetails: movieDetails, personDetails: personDetails, localTrailers: localTrailers, searchPeople: searchPeople, browseActors: browseActors, rankedMovieActors: rankedMovieActors, searchMovies: searchMovies, searchSeries: searchSeries, seriesChildren: seriesChildren, actorMovies: actorMovies, actorSeries: actorSeries, collections: collections, collectionMovies: collectionMovies, collectionActorMovies: collectionActorMovies, favorites: favorites, genres: genres, discoverMovies: discoverMovies, filterMovies: filterMovies, latestMovies: latestMovies, resumeMovies: resumeMovies, recentlyPlayedMovies: recentlyPlayedMovies, setFavorite: setFavorite, authorizeQuickConnect: authorizeQuickConnect, playbackInfo: playbackInfo, selectAudio: selectAudio, subtitleText: subtitleText, reportPlayback: reportPlayback, logout: logout, isAuthenticated: function () { return !!token; } };
  }

  root.SMAIRYS_JELLYFIN = { create: create, normalizeAddress: normalizeAddress };
}(window));
