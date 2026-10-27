(function () {
  'use strict';
  if (!/(?:^|[?&])diagnostics=1(?:&|$)/.test(window.location.search || '')) { return; }
  var entries = [];
  var observer = null;

  function now() {
    return window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
  }

  function record(type, duration, count) {
    entries.push({ type: type, durationMs: Math.max(0, duration), count: typeof count === 'number' ? count : null });
    if (entries.length > 200) { entries.shift(); }
  }

  function snapshot() {
    var cards = document.querySelectorAll('.media-card');
    var visible = 0;
    var memory = null;
    var i;
    for (i = 0; i < cards.length; i += 1) { if (cards[i].offsetWidth || cards[i].offsetHeight) { visible += 1; } }
    if (window.performance && window.performance.memory && typeof window.performance.memory.usedJSHeapSize === 'number') {
      memory = window.performance.memory.usedJSHeapSize;
    }
    return { entries: entries.slice(), visibleCards: visible, usedJSHeapBytes: memory, longTaskObserver: !!observer };
  }

  window.SMAIRYS_DIAGNOSTICS = { now: now, record: record, snapshot: snapshot, clear: function () { entries = []; } };
  if (typeof window.PerformanceObserver === 'function') {
    try {
      observer = new window.PerformanceObserver(function (list) {
        var tasks = list.getEntries();
        var i;
        for (i = 0; i < tasks.length; i += 1) { record('long-task', tasks[i].duration); }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) { observer = null; }
  }
  window.addEventListener('unload', function () { if (observer) { observer.disconnect(); } });
}());
