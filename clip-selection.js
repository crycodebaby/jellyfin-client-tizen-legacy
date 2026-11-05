(function (root) {
  'use strict';

  // Selection does not seek, start playback or report viewing progress.
  function create(duration, initial) {
    var position, start = null, end = null;
    if (typeof duration !== 'number' || !isFinite(duration) || duration <= 0 || typeof initial !== 'number' || !isFinite(initial) || initial < 0 || initial > duration) { throw new Error('invalid position'); }
    position = initial;
    function snapshot() { return { position:position, start:start, end:end, duration:duration, ready:start !== null && end !== null }; }
    function move(seconds) {
      if (typeof seconds !== 'number' || !isFinite(seconds)) { return snapshot(); }
      position = Math.max(0, Math.min(duration, position + seconds));
      return snapshot();
    }
    function mark() {
      if (start === null || end !== null) { start = position; end = null; return {ok:true,state:snapshot()}; }
      if (position <= start) { return {ok:false,reason:'end-before-start',state:snapshot()}; }
      if (position - start > 300) { return {ok:false,reason:'too-long',state:snapshot()}; }
      end = position; return {ok:true,state:snapshot()};
    }
    return { move:move, mark:mark, snapshot:snapshot };
  }
  root.SMAIRYS_CLIP_SELECTION = {create:create};
}(typeof window !== 'undefined' ? window : this));
