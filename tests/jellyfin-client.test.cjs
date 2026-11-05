'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const requests = [];
  const window = { setTimeout, clearTimeout, SMAIRYS_HTTP: { request(options, callback) {
    const entry = { options, callback, aborted: false };
    requests.push(entry);
    return { abort() { entry.aborted = true; } };
  } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../jellyfin-client.js'), 'utf8'), { window, JSON, Array, Date, Math, encodeURIComponent });
  return { api: window.SMAIRYS_JELLYFIN, requests };
}

function authenticate(client, requests) {
  let result;
  client.login('viewer', 'secret', (error, data) => { result = { error, data }; });
  requests[requests.length - 1].callback(null, { AccessToken: 'token-1', User: { Id: 'user-1', Name: 'Viewer' } });
  assert.equal(result.error, null);
  assert.equal(client.isAuthenticated(), true);
}

test('Quick Connect meldet den TV erst nach Freigabe an und gibt kein Secret an die Oberfläche', async () => {
  const { api, requests } = setup(); const client = api.create('http://example.invalid/jellyfin');
  let result, calls = 0;
  client.beginQuickConnect((error, data) => { result = { error, data }; });
  assert.equal(requests[0].options.url, 'http://example.invalid/jellyfin/QuickConnect/Initiate');
  assert.equal(requests[0].options.method, 'POST');
  assert.match(requests[0].options.headers.Authorization, /DeviceId=/);
  requests[0].callback(null, { Code: '123456', Secret: 'private-secret', Authenticated: false });
  assert.equal(result.data.code, '123456'); assert.equal(Object.keys(result.data).length, 1); assert.equal(client.isAuthenticated(), false);
  client.finishQuickConnect((error) => { result = { error }; });
  await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(result.error.type, 'unavailable');
  client.pollQuickConnect((error, data) => { result = { error, data }; });
  assert.match(requests[1].options.url, /\/QuickConnect\/Connect\?secret=private-secret$/);
  requests[1].callback(null, { Authenticated: false, Secret: 'private-secret' }); assert.equal(result.data.authenticated, false);
  client.pollQuickConnect((error, data) => { result = { error, data }; });
  requests[2].callback(null, { Authenticated: true, Secret: 'private-secret' }); assert.equal(result.data.authenticated, true);
  client.finishQuickConnect((error, data) => { calls += 1; result = { error, data }; });
  assert.match(requests[3].options.url, /\/Users\/AuthenticateWithQuickConnect$/);
  assert.equal(JSON.parse(requests[3].options.body).Secret, 'private-secret');
  requests[3].callback(null, { AccessToken: 'example-token', User: { Id: 'user-1', Name: 'Viewer' } });
  assert.equal(calls, 1); assert.equal(result.data.userId, 'user-1'); assert.equal(client.isAuthenticated(), true);
  client.cancelQuickConnect(); assert.equal(client.isAuthenticated(), true);
  const saved = client.exportSession(); assert.equal(saved.token, 'example-token'); assert.equal(saved.userId, 'user-1'); assert.match(saved.deviceId, /^smairys-/);
});

test('Quick Connect verwirft ungültige und nach Abbruch verspätete Antworten', () => {
  const { api, requests } = setup(); const client = api.create('http://example.invalid'); let result, calls = 0;
  client.beginQuickConnect((error) => { result = error; });
  requests[0].callback(null, { Code: 'x', Secret: 'secret', Authenticated: false }); assert.equal(result.type, 'parse');
  client.beginQuickConnect(() => { calls += 1; }); client.cancelQuickConnect();
  assert.equal(requests[1].aborted, true);
  requests[1].callback(null, { Code: '123456', Secret: 'secret', Authenticated: false }); assert.equal(calls, 0);
  client.beginQuickConnect((error) => { result = error; }); requests[2].callback(null, { Code: '123456', Secret: 'secret', Authenticated: false });
  client.pollQuickConnect((error) => { result = error; }); requests[3].callback(null, { Authenticated: true, Secret: 'wrong' }); assert.equal(result.type, 'parse');
  client.pollQuickConnect(() => { calls += 1; }); client.cancelQuickConnect();
  assert.equal(requests[4].aborted, true); requests[4].callback(null, { Authenticated: true }); assert.equal(calls, 0);
});

test('Sitzungswiederherstellung aktiviert nur nach Serverprüfung und unterscheidet Fehler', () => {
  const { api, requests } = setup(); const client = api.create('http://example.invalid');
  const saved = { token: 'example-token', userId: 'user-1', deviceId: 'tv-session-1' }; let result;
  client.restoreSession(saved, (error, data) => { result = { error, data }; });
  assert.equal(client.isAuthenticated(), false); assert.match(requests[0].options.url, /\/Users\/user-1$/);
  assert.match(requests[0].options.headers.Authorization, /DeviceId="tv-session-1"/);
  requests[0].callback({ type: 'network' }); assert.equal(result.error.type, 'network'); assert.equal(client.isAuthenticated(), false);
  client.restoreSession(saved, (error) => { result = { error }; }); requests[1].callback({ type: 'http', status: 401 });
  assert.equal(result.error.type, 'invalid-session'); assert.equal(client.isAuthenticated(), false);
  client.restoreSession(saved, (error) => { result = { error }; }); requests[2].callback({ type: 'http', status: 403 }); assert.equal(result.error.type, 'invalid-session');
  client.restoreSession(saved, (error) => { result = { error }; }); requests[3].callback(null, { Id: 'other' }); assert.equal(result.error.type, 'parse'); assert.equal(client.isAuthenticated(), false);
  client.restoreSession(saved, (error, data) => { result = { error, data }; }); requests[4].callback(null, { Id: 'user-1', Name: 'Viewer' });
  assert.equal(result.error, null); assert.equal(result.data.name, 'Viewer'); assert.equal(client.isAuthenticated(), true);
  assert.equal(client.exportSession().deviceId, 'tv-session-1');
});

test('Abgebrochene Wiederherstellung kann keine Sitzung aktivieren', () => {
  const { api, requests } = setup(); const client = api.create('http://example.invalid'); let calls = 0;
  const handle = client.restoreSession({ token: 'token', userId: 'user', deviceId: 'device' }, () => { calls += 1; });
  handle.abort(); requests[0].callback(null, { Id: 'user' });
  assert.equal(requests[0].aborted, true); assert.equal(calls, 0); assert.equal(client.isAuthenticated(), false);
});

test('Quick Connect autorisiert mit der aktiven Sitzung und prüft die Antwort', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid/jellyfin');
  authenticate(client, requests);
  let result;
  client.authorizeQuickConnect('123456', (error, data) => { result = { error, data }; });
  assert.equal(requests[1].options.method, 'POST');
  assert.equal(requests[1].options.url, 'http://example.invalid/jellyfin/QuickConnect/Authorize?code=123456');
  assert.match(requests[1].options.headers.Authorization, /Token="token-1"/);
  requests[1].callback(null, true);
  assert.equal(result.error, null);
  assert.equal(result.data, true);
  client.authorizeQuickConnect('ABC123', (error, data) => { result = { error, data }; });
  requests[2].callback(null, false);
  assert.equal(result.data, false);
  client.authorizeQuickConnect('ABC123', (error) => { result = { error }; });
  requests[3].callback(null, {});
  assert.equal(result.error.type, 'parse');
  client.authorizeQuickConnect('ABC123', (error) => { result = { error }; });
  requests[4].callback({ type: 'http', status: 404 });
  assert.equal(result.error.status, 404);
});

test('Quick Connect prüft Eingaben und unterdrückt abgebrochene oder veraltete Antworten', async () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  let error;
  client.authorizeQuickConnect('123456', (err) => { error = err; });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(error.type, 'unauthorized');
  authenticate(client, requests);
  client.authorizeQuickConnect('123456&x=1', (err) => { error = err; });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(error.type, 'arguments');
  assert.equal(requests.length, 1);
  let calls = 0;
  const handle = client.authorizeQuickConnect('123456', () => { calls += 1; });
  handle.abort();
  requests[1].callback(null, true);
  assert.equal(requests[1].aborted, true);
  assert.equal(calls, 0);
  client.authorizeQuickConnect('123456', () => { calls += 1; });
  client.logout();
  requests[2].callback(null, true);
  assert.equal(requests[2].aborted, true);
  assert.equal(calls, 0);
});

test('Mehrdeutiges Quick Connect 401 erhält die Sitzung bis eine reguläre Anfrage sie prüft', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let error;
  client.authorizeQuickConnect('123456', (err) => { error = err; });
  requests[1].callback({ type: 'http', status: 401 });
  assert.equal(error.type, 'http');
  assert.equal(error.status, 401);
  assert.equal(client.isAuthenticated(), true);
  client.movies(0, 5, (err) => { error = err; });
  requests[2].callback({ type: 'http', status: 401 });
  assert.equal(error.type, 'unauthorized');
  assert.equal(client.isAuthenticated(), false);
});

test('Verlauf fragt serverseitig begrenzte Filmseiten und modelliert Wiedergabedaten', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let result;
  client.resumeMovies(5, 5, (error, data) => { result = { error, data }; });
  assert.match(requests[1].options.url, /includeItemTypes=Movie&mediaTypes=Video/);
  assert.match(requests[1].options.url, /filters=IsResumable.*sortBy=DatePlayed&sortOrder=Descending.*enableUserData=true&startIndex=5&limit=5/);
  requests[1].callback(null, { StartIndex: 5, TotalRecordCount: 6, Items: [{ Id: 'film', Name: 'Film', RunTimeTicks: 1000000000, UserData: { PlaybackPositionTicks: 250000000, PlayedPercentage: 25, Played: false } }] });
  assert.equal(result.error, null);
  assert.equal(result.data.total, 6);
  assert.equal(result.data.items[0].durationSeconds, 100);
  assert.equal(result.data.items[0].positionSeconds, 25);
  assert.equal(result.data.items[0].playedPercentage, 25);
  assert.equal(result.data.items[0].isPlayed, false);
  client.recentlyPlayedMovies(0, 5, (error, data) => { result = { error, data }; });
  assert.match(requests[2].options.url, /includeItemTypes=Movie&mediaTypes=Video/);
  assert.match(requests[2].options.url, /isPlayed=true&sortBy=DatePlayed&sortOrder=Descending/);
  requests[2].callback(null, { StartIndex: 0, TotalRecordCount: 1, Items: [{ Id: 'film', Name: 'Film', RunTimeTicks: -1, UserData: { PlaybackPositionTicks: NaN, PlayedPercentage: 101, Played: true } }] });
  assert.equal(result.data.items[0].isPlayed, true);
  assert.equal(result.data.items[0].durationSeconds, 0);
  assert.equal(result.data.items[0].positionSeconds, 0);
  assert.equal(result.data.items[0].playedPercentage, 0);
});

test('Verlaufsanfragen können abgebrochen werden und verwerfen ungültige Seiten', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let calls = 0;
  const handle = client.resumeMovies(0, 5, () => { calls += 1; });
  handle.abort();
  requests[1].callback(null, { StartIndex: 0, TotalRecordCount: 0, Items: [] });
  assert.equal(calls, 0);
  let error;
  client.recentlyPlayedMovies(0, 5, (err) => { error = err; });
  requests[2].callback(null, { StartIndex: 1, TotalRecordCount: 0, Items: [] });
  assert.equal(error.type, 'parse');
});

test('Fehlender Prozentwert wird aus gültiger Position und Laufzeit begrenzt berechnet', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let result;
  client.resumeMovies(0, 5, (error, data) => { result = { error, data }; });
  requests[1].callback(null, { StartIndex: 0, TotalRecordCount: 4, Items: [
    { Id: 'a', Name: 'A', RunTimeTicks: 1000000000, UserData: { PlaybackPositionTicks: 250000000 } },
    { Id: 'b', Name: 'B', RunTimeTicks: 1000000000, UserData: { PlaybackPositionTicks: 2000000000 } },
    { Id: 'c', Name: 'C', RunTimeTicks: 0, UserData: { PlaybackPositionTicks: 100000000 } },
    { Id: 'd', Name: 'D', RunTimeTicks: 1000000000, UserData: { PlaybackPositionTicks: 250000000, PlayedPercentage: 0 } }
  ] });
  assert.equal(result.error, null);
  assert.deepEqual(Array.from(result.data.items, item => item.playedPercentage), [25, 100, 0, 0]);
  assert.equal(result.data.items[1].isPlayed, false);
});

test('Anmeldung und paginierte Filmmodelle verwenden das Jellyfin-12-Schema', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid/jellyfin/');
  authenticate(client, requests);
  assert.equal(requests[0].options.url, 'http://example.invalid/jellyfin/Users/AuthenticateByName');
  assert.match(requests[0].options.headers.Authorization, /^MediaBrowser /);
  assert.equal(JSON.parse(requests[0].options.body).Username, 'viewer');
  let result;
  client.movies(5, 5, (error, data) => { result = { error, data }; });
  const request = requests[1];
  assert.match(request.options.url, /\/Items\?userId=user-1.*startIndex=5&limit=5/);
  assert.match(request.options.headers.Authorization, /Token="token-1"/);
  request.callback(null, { StartIndex: 5, TotalRecordCount: 6, Items: [{ Id: 'id/1', Name: 'Film', Overview: 'Text', ImageTags: { Primary: 'tag' }, BackdropImageTags: ['backdrop-tag'] }] });
  assert.equal(result.error, null);
  assert.equal(result.data.items[0].id, 'id/1');
  assert.match(result.data.items[0].imageUrl, /id%2F1\/Images\/Primary\?maxWidth=360&tag=tag/);
  assert.doesNotMatch(result.data.items[0].imageUrl, /token-1/);
  assert.match(result.data.items[0].backdropUrl, /id%2F1\/Images\/Backdrop\/0\?maxWidth=1280&tag=backdrop-tag/);
  assert.doesNotMatch(result.data.items[0].backdropUrl, /token-1/);
});

test('Anmeldung verwirft fehlerhafte Antworten und Abbruch verhindert späte Sitzung', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  let calls = 0;
  client.login('viewer', 'secret', () => { calls += 1; });
  client.logout();
  assert.equal(requests[0].aborted, true);
  requests[0].callback(null, { AccessToken: 'late', User: { Id: 'user' } });
  assert.equal(client.isAuthenticated(), false);
  assert.equal(calls, 0);
  let error;
  client.login('viewer', 'secret', (err) => { error = err; });
  requests[1].callback(null, { User: { Id: 'user' } });
  assert.equal(error.type, 'parse');
});

test('401 räumt die Sitzung und offene Anfragen auf', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let error;
  let secondError;
  client.movies(0, 5, (err) => { error = err; });
  client.movies(5, 5, (err) => { secondError = err; });
  requests[1].callback({ type: 'http', status: 401 });
  assert.equal(error.type, 'unauthorized');
  assert.equal(client.isAuthenticated(), false);
  assert.equal(requests[2].aborted, true);
  assert.equal(secondError.type, 'unauthorized');
  requests[2].callback(null, {});
});

test('Logout löscht lokale Sitzung sofort und verwendet alte Sitzung für Server-Logout', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  client.logout();
  assert.equal(client.isAuthenticated(), false);
  assert.match(requests[1].options.url, /\/Sessions\/Logout$/);
  assert.equal(requests[1].options.emptyResponse, true);
  assert.match(requests[1].options.headers.Authorization, /Token="token-1"/);
});

test('Ein abgebrochener paralleler Aufrufer erhält auch bei 401 keine verspätete Benachrichtigung', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let secondCalls = 0;
  let second;
  client.movies(0, 5, () => { second.abort(); });
  second = client.movies(5, 5, () => { secondCalls += 1; });
  requests[1].callback({ type: 'http', status: 401 });
  assert.equal(secondCalls, 0);
});

test('Erneute Anmeldung meldet die vorherige Sitzung serverseitig ab', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  client.login('other', 'secret', () => {});
  assert.match(requests[1].options.url, /\/Sessions\/Logout$/);
  assert.match(requests[2].options.url, /\/Users\/AuthenticateByName$/);
  assert.equal(client.isAuthenticated(), false);
});

test('Ungültige Adressen und unplausible Seiten werden abgelehnt', () => {
  const { api, requests } = setup();
  for (const url of ['http://user:pw@example.invalid', 'http://example.invalid/?bad=1', 'javascript:alert(1)', 'http://example.invalid/#x']) assert.throws(() => api.create(url));
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let error;
  client.movies(0, 5, (err) => { error = err; });
  requests[1].callback(null, { StartIndex: 4, TotalRecordCount: 1, Items: [] });
  assert.equal(error.type, 'parse');
});

test('Fehlende Poster und Hintergründe ergeben leere Bildadressen', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let result;
  client.movies(0, 5, (error, data) => { result = { error, data }; });
  requests[1].callback(null, { StartIndex: 0, TotalRecordCount: 1, Items: [{ Id: 'one', Name: 'Ohne Bild' }] });
  assert.equal(result.error, null);
  assert.equal(result.data.items[0].imageUrl, '');
  assert.equal(result.data.items[0].backdropUrl, '');
});

test('Wiedergabeinfo bietet kontrollierte Direkt- und Transcoding-Quellen', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid/jellyfin');
  authenticate(client, requests);
  let result;
  client.playbackInfo('film-1', (error, data) => { result = { error, data }; });
  assert.match(requests[1].options.url, /\/Items\/film-1\/PlaybackInfo$/);
  const body = JSON.parse(requests[1].options.body);
  assert.equal(body.UserId, 'user-1');
  assert.equal(body.DeviceProfile.TranscodingProfiles[0].Protocol, 'hls');
  requests[1].callback(null, { PlaySessionId: 'session', MediaSources: [{ Id: 'source', SupportsDirectPlay: true }] });
  assert.equal(result.data.playMethod, 'DirectPlay');
  assert.match(result.data.url, /\/Videos\/film-1\/stream\?static=true/);
  assert.match(result.data.url, /ApiKey=token-1/);
  client.playbackInfo('film-2', (error, data) => { result = { error, data }; });
  requests[2].callback(null, { PlaySessionId: 'session2', MediaSources: [{ Id: 'source2', SupportsDirectPlay: false, SupportsTranscoding: true, TranscodingUrl: '/Videos/film-2/master.m3u8?api_key=token-1' }] });
  assert.equal(result.data.playMethod, 'Transcode');
  assert.equal(result.data.url, 'http://example.invalid/jellyfin/Videos/film-2/master.m3u8?ApiKey=token-1');
  client.playbackInfo('film-3', (error, data) => { result = { error, data }; });
  requests[3].callback(null, { PlaySessionId: 'session3', MediaSources: [{ Id: 'evil', SupportsTranscoding: true, TranscodingUrl: '//evil.invalid/video' }] });
  assert.equal(result.error.type, 'playback-unavailable');
});

test('Transcoding bevorzugt deutsche Tonspur mit zugehöriger Quelle und sicherem Rückfall', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let result;
  const source = { Id: 'src', SupportsTranscoding: true, TranscodingUrl: '/Videos/film/master.m3u8', DefaultAudioStreamIndex: 2,
    MediaStreams: [{ Type: 'Audio', Language: 'DEU', Index: 0 }] };
  client.playbackInfo('film', (error, data) => { result = { error, data }; });
  requests[1].callback(null, { PlaySessionId: 'one', MediaSources: [source] });
  assert.equal(result, undefined);
  const body = JSON.parse(requests[2].options.body);
  assert.equal(body.MediaSourceId, 'src');
  assert.equal(body.AudioStreamIndex, 0);
  assert.equal(body.EnableDirectPlay, false);
  requests[2].callback(null, { PlaySessionId: 'two', MediaSources: [{ ...source, TranscodingUrl: '//evil.invalid/path' }] });
  assert.equal(result.data.playSessionId, 'one');
  assert.match(result.data.url, /^http:\/\/example\.invalid\/Videos\//);
});

test('Zweite Wiedergabeanfrage ist abbrechbar und ignoriert späte Antworten', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let calls = 0;
  const handle = client.playbackInfo('film', () => { calls += 1; });
  requests[1].callback(null, { PlaySessionId: 'one', MediaSources: [{ Id: 'src', SupportsTranscoding: true, TranscodingUrl: '/Videos/film/master.m3u8', MediaStreams: [{ Type: 'Audio', Language: 'ger', Index: 1 }] }] });
  handle.abort();
  assert.equal(requests[2].aborted, true);
  requests[2].callback(null, { PlaySessionId: 'two', MediaSources: [] });
  assert.equal(calls, 0);
});

test('Jellyfin-Tonspuren stammen aus der gewählten Quelle und Auswahl verhandelt neu', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let result;
  client.playbackInfo('film', (error, data) => { result = { error, data }; });
  requests[1].callback(null, { PlaySessionId: 'one', MediaSources: [{ Id: 'src', SupportsDirectPlay: true, DefaultAudioStreamIndex: 2, MediaStreams: [
    { Type: 'Audio', Index: 2, Language: 'eng', DisplayTitle: 'English' },
    { Type: 'Audio', Index: 4, Language: 'deu', DisplayTitle: 'Deutsch' },
    { Type: 'Subtitle', Index: 5, Language: 'deu' }
  ] }] });
  assert.equal(result.data.audioTracks.length, 2);
  assert.equal(result.data.audioTracks[1].index, 4);
  assert.equal(result.data.audioTracks[1].language, 'deu');
  client.selectAudio('film', 'src', 4, (error, data) => { result = { error, data }; });
  const body = JSON.parse(requests[2].options.body);
  assert.equal(body.MediaSourceId, 'src');
  assert.equal(body.AudioStreamIndex, 4);
  assert.equal(body.EnableDirectPlay, false);
  assert.equal(body.EnableDirectStream, false);
  requests[2].callback(null, { PlaySessionId: 'two', MediaSources: [{ Id: 'src', SupportsTranscoding: true, DefaultAudioStreamIndex: 4, TranscodingUrl: '/Videos/film/master.m3u8' }] });
  assert.equal(result.error, null);
  assert.equal(result.data.audioStreamIndex, 4);
  assert.equal(result.data.playMethod, 'Transcode');
  client.selectAudio('film', 'src', 4, (error, data) => { result = { error, data }; });
  requests[3].callback(null, { PlaySessionId: 'three', MediaSources: [{ Id: 'src', SupportsTranscoding: true, DefaultAudioStreamIndex: 2, TranscodingUrl: '/Videos/film/master.m3u8' }] });
  assert.equal(result.error.type, 'playback-unavailable');
});

test('HLS akzeptiert dieselbe Jellyfin-UUID mit Bindestrichen, aber keine fremden Pfade', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  const item = '0123456789abcdef0123456789abcdef';
  function respond(path) {
    let result;
    client.selectAudio(item, 'src', 4, (error, data) => { result = { error, data }; });
    requests[requests.length - 1].callback(null, { PlaySessionId: 'one', MediaSources: [{ Id: 'src', SupportsTranscoding: true, DefaultAudioStreamIndex: 4, TranscodingUrl: path }] });
    return result;
  }
  assert.equal(respond('/videos/01234567-89ab-cdef-0123-456789abcdef/master.m3u8').error, null);
  assert.equal(respond('/videos/01234567-89ab-cdef-0123-456789abcdee/master.m3u8').error.type, 'playback-unavailable');
  assert.equal(respond('/videos/01234567-89ab-cdef-0123-456789abcdef/other.m3u8').error.type, 'playback-unavailable');
});

test('Wiedergabestatus meldet die Position in Ticks mit Sitzungskennungen', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  const info = { itemId: 'film', mediaSourceId: 'source', playSessionId: 'session', playMethod: 'DirectPlay' };
  client.reportPlayback('progress', info, 12.5, true);
  assert.equal(requests[1].options.url, 'http://example.invalid/Sessions/Playing/Progress');
  assert.equal(requests[1].options.emptyResponse, true);
  const body = JSON.parse(requests[1].options.body);
  assert.equal(body.PositionTicks, 125000000);
  assert.equal(body.IsPaused, true);
  assert.equal(body.PlaySessionId, 'session');
  client.reportPlayback('stopped', info, 20, false);
  assert.match(requests[2].options.url, /\/Sessions\/Playing\/Stopped$/);
  client.logout();
  assert.equal(requests[1].aborted, true);
  assert.equal(requests[2].aborted, true);
});

test('Transcoding-URL verwendet nur den aktuellen Schlüssel und einen passenden lokalen Videopfad', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid/jellyfin');
  authenticate(client, requests);
  let result;
  function response(source) {
    client.playbackInfo('film', (error, data) => { result = { error, data }; });
    requests[requests.length - 1].callback(null, { PlaySessionId: 'session', MediaSources: [source] });
    return result;
  }
  const source = { Id: 'src', SupportsTranscoding: true, TranscodingUrl: '/Videos/film/master.m3u8?quality=1' };
  assert.match(response(source).data.url, /quality=1&ApiKey=token-1$/);
  assert.match(response({ ...source, TranscodingUrl: '/Videos/film/master.m3u8?ApiKey=token-1' }).data.url, /\?ApiKey=token-1$/);
  assert.equal(response({ ...source, TranscodingUrl: '/Videos/film/master.m3u8?ApiKey=other' }).error.type, 'playback-unavailable');
  assert.equal(response({ ...source, TranscodingUrl: '/Videos/film/master.m3u8?ApiKey=token-1&api_key=other' }).error.type, 'playback-unavailable');
  assert.equal(response({ ...source, TranscodingUrl: '/Videos/film/master.m3u8?api_key=other' }).error.type, 'playback-unavailable');
  assert.equal(response({ ...source, TranscodingUrl: '/Videos/film/master.m3u8?api_key=token-1&%61pi_key=other' }).error.type, 'playback-unavailable');
  assert.equal(response({ ...source, TranscodingUrl: '/redirect?url=malicious' }).error.type, 'playback-unavailable');
  assert.equal(response({ ...source, TranscodingUrl: '/Videos/film/../redirect' }).error.type, 'playback-unavailable');
  assert.equal(response({ ...source, SupportsDirectPlay: true }).data.playMethod, 'DirectPlay');
});

test('Filmdetails und Darstellerbilder werden aus lokalen Jellyfin-IDs gebildet', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid/jellyfin');
  authenticate(client, requests);
  let result;
  client.movieDetails('film', (error, data) => { result = { error, data }; });
  assert.match(requests[1].options.url, /Users\/user-1\/Items\/film$/);
  requests[1].callback(null, { Id: 'film', Name: 'Film', UserData: { IsFavorite: true }, People: [{ Id: 'actor', Name: 'Name', Type: 'Actor', Role: 'Rolle', PrimaryImageTag: 'tag' }, { Id: 'director', Name: 'Regie', Type: 'Director' }] });
  assert.equal(result.data.isFavorite, true);
  assert.equal(result.data.people.length, 1);
  assert.equal(result.data.people[0].role, 'Rolle');
  assert.match(result.data.people[0].imageUrl, /\/Items\/actor\/Images\/Primary\?maxWidth=240&tag=tag$/);
});

test('Personensuche, Darstellerfilme und Favoriten verwenden begrenzte Seiten', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let result;
  client.searchPeople('A & B', 0, 5, (error, data) => { result = { error, data }; });
  assert.match(requests[1].options.url, /\/Persons\?.*searchTerm=A%20%26%20B/);
  requests[1].callback(null, { StartIndex: 0, TotalRecordCount: 1, Items: [{ Id: 'actor', Name: 'A', ImageTags: { Primary: 'tag' } }] });
  assert.equal(result.data.items[0].name, 'A');
  client.actorMovies('actor', 0, 5, (error, data) => { result = { error, data }; });
  assert.match(requests[2].options.url, /personTypes=Actor&personIds=actor/);
  requests[2].callback(null, { StartIndex: 0, TotalRecordCount: 1, Items: [{ Id: 'film', Name: 'Film' }] });
  assert.equal(result.data.items[0].id, 'film');
  client.favorites(0, 5, (error, data) => { result = { error, data }; });
  assert.match(requests[3].options.url, /isFavorite=true/);
  requests[3].callback(null, { StartIndex: 0, TotalRecordCount: 0, Items: [] });
  assert.equal(result.data.total, 0);
  client.setFavorite('film', true, (error, data) => { result = { error, data }; });
  assert.equal(requests[4].options.method, 'POST');
  requests[4].callback(null, { IsFavorite: true });
  assert.equal(result.data.isFavorite, true);
  client.setFavorite('film', false, (error, data) => { result = { error, data }; });
  assert.equal(requests[5].options.method, 'DELETE');
  requests[5].callback(null, { IsFavorite: false });
  assert.equal(result.data.isFavorite, false);
});

test('Sammlung wird serverseitig nach Schauspieler und Veröffentlichungsdatum gefiltert', async () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let result, calls = 0;
  client.collectionActorMovies('collection-1', 'actor-1', 5, 5, (error, data) => { result = { error, data }; calls += 1; });
  const request = new URL(requests[1].options.url);
  assert.equal(request.searchParams.get('parentId'), 'collection-1');
  assert.equal(request.searchParams.get('personIds'), 'actor-1');
  assert.equal(request.searchParams.get('personTypes'), 'Actor');
  assert.equal(request.searchParams.get('includeItemTypes'), 'Movie');
  assert.equal(request.searchParams.get('sortBy'), 'PremiereDate,SortName');
  assert.equal(request.searchParams.get('startIndex'), '5');
  assert.equal(request.searchParams.get('limit'), '5');
  requests[1].callback(null, {StartIndex: 5, TotalRecordCount: 6, Items: [{Id:'film', Name:'Film'}]});
  assert.equal(result.data.items[0].id, 'film'); assert.equal(result.data.total, 6);
  client.collectionActorMovies('collection-1', '../invalid', 0, 5, error => { result = { error }; });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(result.error.type, 'arguments'); assert.equal(requests.length, 2);
  const handle = client.collectionActorMovies('collection-1', 'actor-1', 0, 5, () => { calls += 1; });
  handle.abort(); requests[2].callback(null, {StartIndex:0,TotalRecordCount:0,Items:[]});
  assert.equal(calls,1);
});

test('Neue Anfragen respektieren Abbruch und Sitzungswechsel', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  let calls = 0;
  const handle = client.searchPeople('A', 0, 5, () => { calls += 1; });
  handle.abort();
  requests[1].callback(null, {});
  client.movieDetails('film', () => { calls += 1; });
  client.logout();
  requests[2].callback(null, { Id: 'film', Name: 'Film' });
  assert.equal(calls, 0);
  assert.equal(requests[2].aborted, true);
});


test('Filmdetails übernehmen nur plausible gespeicherte Wiedergabepositionen', () => {
  const { api, requests } = setup();
  const client = api.create('http://example.invalid');
  authenticate(client, requests);
  function read(position, duration) {
    let result;
    client.movieDetails('film', (error, data) => { result = data; });
    requests[requests.length - 1].callback(null, { Id: 'film', Name: 'Film', RunTimeTicks: duration, UserData: { PlaybackPositionTicks: position } });
    return result.resumeSeconds;
  }
  assert.equal(read(300000000, 1000000000), 30);
  assert.equal(read(-1, 1000000000), 0);
  assert.equal(read(1000000000, 1000000000), 0);
  assert.equal(read(300000000, undefined), 0);
  assert.equal(read(Infinity, 1000000000), 0);
});

test('Text subtitles come from authenticated Jellyfin metadata and safe endpoint', () => {
  const { api, requests } = setup(); const client = api.create('http://example.invalid/jellyfin'); authenticate(client, requests);
  let playback, result;
  client.playbackInfo('film', (error, data) => { playback = { error, data }; });
  requests[1].callback(null, { PlaySessionId: 'session', MediaSources: [{ Id: 'source', SupportsDirectPlay: true, MediaStreams: [{ Type: 'Subtitle', Index: 7, Language: 'deu', DisplayTitle: 'Deutsch', IsTextSubtitleStream: true }, { Type: 'Subtitle', Index: 8, IsTextSubtitleStream: false }] }] });
  assert.equal(playback.data.subtitleTracks.length, 2); assert.equal(playback.data.subtitleTracks[0].text, true); assert.equal(playback.data.subtitleTracks[1].text, false);
  client.subtitleText('film', 'source', 7, (error, data) => { result = { error, data }; });
  assert.match(requests[2].options.url, /\/Videos\/film\/source\/Subtitles\/7\/Stream\.vtt/);
  assert.doesNotMatch(requests[2].options.url, /token-1/); assert.match(requests[2].options.headers.Authorization, /Token="token-1"/);
  requests[2].callback(null, 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHallo\n'); assert.equal(result.error, null);
  client.subtitleText('film', 'source', 7, (error) => { result = error; }); requests[3].callback(null, '<html>error</html>'); assert.equal(result.type, 'parse');
});
