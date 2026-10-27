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
  var homeView = document.getElementById('home-view');
  var sectionView = document.getElementById('section-view');
  var searchInput = document.getElementById('search-input');
  var serverInput = document.getElementById('server-url');

  function applyBranding() {
    var branding = window.SMAIRYS_BRANDING || {};
    var name = typeof branding.appTitle === 'string' ? branding.appTitle : 'Smairys Mediathek';
    var slogan = typeof branding.slogan === 'string' ? branding.slogan : 'deine freie Kinoerfahrung';
    document.title = name;
    document.getElementById('brand-name-main').textContent = typeof branding.headerName === 'string' ? branding.headerName : 'SMAIRYS';
    document.getElementById('brand-name-sub').textContent = typeof branding.headerSubtitle === 'string' ? branding.headerSubtitle : 'MEDIATHEK';
    document.getElementById('brand-avatar').textContent = typeof branding.avatarInitial === 'string' ? branding.avatarInitial : 'S';
    document.querySelector('.brand').setAttribute('aria-label', name + (slogan ? ' – ' + slogan : ''));
  }

  function fitViewport() {
    var app = document.getElementById('app');
    var width = window.innerWidth || 1920;
    var height = window.innerHeight || 1080;
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

  function focusElement(element) {
    if (!element) { return; }
    if (focused !== element) { removeClass(focused, 'is-focused'); }
    focused = element;
    addClass(element, 'is-focused');
    element.focus();
  }

  function nodesForZone(zone) {
    var elements = document.querySelectorAll('[data-zone="' + zone + '"]');
    var result = [];
    var i;
    for (i = 0; i < elements.length; i += 1) { if (elements[i].style.display !== 'none') { result.push(elements[i]); } }
    return result;
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
    var i;
    while (container.firstChild) { container.removeChild(container.firstChild); }
    for (i = 0; i < indexes.length; i += 1) { container.appendChild(createCard(items[indexes[i]], indexes[i], zone)); }
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

  function renderSection() {
    var data = pages[page];
    var indexes = sectionIndexes();
    var empty = document.getElementById('empty-state');
    document.getElementById('page-title').textContent = data.title;
    document.getElementById('page-description').textContent = data.description;
    document.getElementById('section-title').textContent = data.heading;
    sectionView.className = page === 'entdecken' ? 'section-view is-discover' : 'section-view';
    document.getElementById('search-wrap').style.display = page === 'suche' ? 'block' : 'none';
    document.getElementById('people-section').style.display = page === 'entdecken' ? 'block' : 'none';
    renderCards(document.getElementById('section-cards'), indexes);
    if (page === 'entdecken') { renderCards(document.getElementById('people-cards'), [6, 7], 'people'); }
    empty.style.display = indexes.length ? 'none' : 'block';
    empty.textContent = page === 'merkliste' ? 'Noch keine Beispieltitel gemerkt.' : 'Keine Beispieltitel gefunden.';
  }

  function setPage(nextPage) {
    var nav = nodesForZone('nav');
    var i;
    page = nextPage;
    searchInput.value = '';
    for (i = 0; i < nav.length; i += 1) {
      removeClass(nav[i], 'is-active');
      nav[i].removeAttribute('aria-current');
      if (nav[i].getAttribute('data-page') === page) {
        addClass(nav[i], 'is-active');
        nav[i].setAttribute('aria-current', 'page');
      }
    }
    homeView.style.display = page === 'start' ? 'block' : 'none';
    sectionView.style.display = page === 'start' ? 'none' : 'block';
    if (page !== 'start') { renderSection(); }
    focusElement(currentNav());
  }

  function activeCards() {
    var container = page === 'start' ? document.getElementById('home-cards') : document.getElementById('section-cards');
    var nodes = container.querySelectorAll('[data-zone="cards"]');
    var result = [];
    var i;
    for (i = 0; i < nodes.length; i += 1) { result.push(nodes[i]); }
    return result;
  }

  function openConnection() {
    returnFocus = focused;
    modal = 'connection';
    document.getElementById('connection-modal').style.display = 'block';
    focusElement(serverInput);
  }

  function closeConnection() {
    document.getElementById('connection-modal').style.display = 'none';
    modal = '';
    focusElement(returnFocus || currentNav());
  }

  function setConnectionStatus(kind, message) {
    var status = document.getElementById('connection-status');
    status.className = 'connection-status' + (kind ? ' is-' + kind : '');
    status.textContent = message;
  }

  function checkServer() {
    var base = serverInput.value.replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
    var done = false;
    var xhr;
    if (!/^https?:\/\/[^\s/]+/i.test(base)) {
      setConnectionStatus('error', 'Bitte eine gültige Adresse mit http:// oder https:// eingeben.');
      focusElement(serverInput);
      return;
    }
    if (request) { request.abort(); }
    setConnectionStatus('', 'Verbindung wird geprüft …');
    xhr = new XMLHttpRequest();
    request = xhr;
    xhr.onreadystatechange = function () {
      var info;
      if (xhr.readyState !== 4 || done || request !== xhr) { return; }
      done = true;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          info = JSON.parse(xhr.responseText);
          setConnectionStatus('ok', 'Verbunden mit ' + (info.ServerName || 'Jellyfin') + (info.Version ? ' · ' + info.Version : ''));
        } catch (error) { setConnectionStatus('error', 'Der Server hat keine gültige Jellyfin-Antwort gesendet.'); }
      } else { setConnectionStatus('error', xhr.status ? 'Verbindung fehlgeschlagen · HTTP ' + xhr.status : 'Keine Antwort. Adresse und Netzwerk prüfen.'); }
    };
    xhr.ontimeout = function () { if (!done && request === xhr) { done = true; setConnectionStatus('error', 'Zeitüberschreitung. Adresse und Netzwerk prüfen.'); } };
    xhr.onerror = function () { if (!done && request === xhr) { done = true; setConnectionStatus('error', 'Verbindung fehlgeschlagen. Adresse, Netzwerk und CORS prüfen.'); } };
    try {
      xhr.open('GET', base + '/System/Info/Public', true);
      xhr.timeout = 8000;
      xhr.send(null);
    } catch (error) { done = true; setConnectionStatus('error', 'Die Serveradresse konnte nicht geöffnet werden.'); }
  }

  function openDetail(index) {
    var item = items[index];
    var isPerson;
    var saveButton = document.getElementById('save-button');
    if (!item) { return; }
    returnFocus = focused;
    activeItem = index;
    modal = 'detail';
    isPerson = item.category === 'personen';
    document.getElementById('detail-copy').className = isPerson ? 'detail-copy is-person' : 'detail-copy';
    document.getElementById('detail-kicker').textContent = isPerson ? 'BEISPIELPERSON · VORSCHAU' : 'BEISPIELTITEL · VORSCHAU';
    document.getElementById('detail-title').textContent = item.title;
    document.getElementById('detail-description').textContent = item.description;
    document.getElementById('detail-art').className = 'detail-art art-' + item.art;
    document.getElementById('detail-footnote').textContent = isPerson ? 'Darstelleransichten folgen mit der Jellyfin-Anbindung.' : 'Wiedergabe und Bibliothek folgen nach der Verbindung.';
    saveButton.style.display = isPerson ? 'none' : 'inline-block';
    saveButton.textContent = saved[index] ? 'Aus Merkliste entfernen' : 'Merken';
    document.getElementById('detail-modal').style.display = 'block';
    focusElement(isPerson ? document.getElementById('detail-close') : saveButton);
  }

  function closeDetail() {
    document.getElementById('detail-modal').style.display = 'none';
    modal = '';
    if (page === 'merkliste') { renderSection(); focusElement(activeCards()[0] || currentNav()); }
    else { focusElement(returnFocus || currentNav()); }
  }

  function activate(element) {
    var action = element && element.getAttribute('data-action');
    var targetPage = element && element.getAttribute('data-page');
    if (targetPage) { setPage(targetPage); }
    else if (action === 'connection') { openConnection(); }
    else if (action === 'close-connection') { closeConnection(); }
    else if (action === 'check') { checkServer(); }
    else if (action === 'samples') { focusElement(activeCards()[0]); }
    else if (action === 'detail') { openDetail(parseInt(element.getAttribute('data-item'), 10)); }
    else if (action === 'close-detail') { closeDetail(); }
    else if (action === 'save') {
      saved[activeItem] = !saved[activeItem];
      document.getElementById('save-button').textContent = saved[activeItem] ? 'Aus Merkliste entfernen' : 'Merken';
    }
  }

  function move(key) {
    var zone = focused && focused.getAttribute('data-zone');
    var cards;
    var index;
    if (modal) {
      zone = modal;
      if (focused && focused.tagName === 'INPUT' && (key === 37 || key === 39)) { return false; }
      if (key === 38 || key === 37) { moveWithin(zone, -1); }
      if (key === 40 || key === 39) { moveWithin(zone, 1); }
      return true;
    }
    if (zone === 'nav') {
      if (key === 38) { moveWithin('nav', -1); }
      else if (key === 40) { moveWithin('nav', 1); }
      else if (key === 39) { focusElement(page === 'start' ? nodesForZone('hero')[0] : (page === 'suche' ? searchInput : (activeCards()[0] || document.getElementById('profile-button')))); }
    } else if (zone === 'profile') {
      if (key === 37) { focusElement(currentNav()); }
      else if (key === 40) { focusElement(page === 'start' ? nodesForZone('hero')[0] : (page === 'suche' ? searchInput : (activeCards()[0] || currentNav()))); }
    } else if (zone === 'hero') {
      if (key === 37 && indexOfNode(nodesForZone('hero'), focused) === 0) { focusElement(currentNav()); }
      else if (key === 37) { moveWithin('hero', -1); }
      else if (key === 39) { moveWithin('hero', 1); }
      else if (key === 38) { focusElement(document.getElementById('profile-button')); }
      else if (key === 40) { focusElement(activeCards()[0]); }
    } else if (zone === 'cards') {
      cards = activeCards();
      index = indexOfNode(cards, focused);
      if (key === 37) { focusElement(index > 0 ? cards[index - 1] : currentNav()); }
      else if (key === 39) { focusElement(cards[Math.min(index + 1, cards.length - 1)]); }
      else if (key === 38) { focusElement(page === 'start' ? nodesForZone('hero')[0] : (page === 'suche' ? searchInput : document.getElementById('profile-button'))); }
      else if (key === 40 && page === 'entdecken') { focusElement(nodesForZone('people')[0]); }
    } else if (zone === 'people') {
      if (key === 37 && indexOfNode(nodesForZone('people'), focused) === 0) { focusElement(currentNav()); }
      else if (key === 37) { moveWithin('people', -1); }
      else if (key === 39) { moveWithin('people', 1); }
      else if (key === 38) { focusElement(activeCards()[0]); }
    } else if (zone === 'search') {
      if (key === 37 || key === 39) { return false; }
      if (key === 38) { focusElement(document.getElementById('profile-button')); }
      else if (key === 40) { focusElement(activeCards()[0] || currentNav()); }
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

  document.addEventListener('keydown', function (event) {
    var key = event.keyCode || event.which;
    var modalNodes;
    var modalIndex;
    if (key === 9 && modal) {
      modalNodes = nodesForZone(modal);
      modalIndex = indexOfNode(modalNodes, focused);
      if (modalIndex < 0) { modalIndex = 0; }
      focusElement(modalNodes[(modalIndex + (event.shiftKey ? -1 : 1) + modalNodes.length) % modalNodes.length]);
      event.preventDefault();
    } else if (key >= 37 && key <= 40) {
      if (move(key)) { event.preventDefault(); }
    } else if (key === 13) {
      if (event.target && event.target.tagName === 'INPUT') { return; }
      event.preventDefault();
      activate(focused);
    } else if (key === 10009 || key === 27 || (key === 8 && (!event.target || event.target.tagName !== 'INPUT'))) {
      event.preventDefault();
      if (modal === 'connection') { closeConnection(); }
      else if (modal === 'detail') { closeDetail(); }
      else if (page !== 'start') { setPage('start'); }
      else { focusElement(currentNav()); }
    }
  });

  searchInput.oninput = function () { if (page === 'suche') { renderSection(); } };
  applyBranding();
  renderCards(document.getElementById('home-cards'), [0, 1, 2, 3, 4]);
  window.onresize = fitViewport;
  window.onload = function () { fitViewport(); focusElement(currentNav()); };
}());
