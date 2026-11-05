'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
function createJellyfinClipResolver(options) {
  const base = new URL(options.server);
  if (!['http:','https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || !Array.isArray(options.mediaRoots) || !options.mediaRoots.length || options.mediaRoots.some(r=>typeof r !== 'string' || !path.isAbsolute(r))) throw new Error('invalid configuration');
  const prefix = base.href.replace(/\/+$/, '');
  const request = options.fetch || fetch;
  async function get(resource, token) {
    const response = await request(prefix + resource, {headers:{Authorization:'MediaBrowser Client="Smairys%20Clips", Device="Server", DeviceId="smairys-clips", Version="1.0", Token="'+encodeURIComponent(token)+'"'},redirect:'error',signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('jellyfin unavailable');
    return response.json();
  }
  function within(root, file) { const relative=path.relative(root,file); return relative !== '' && relative !== '..' && !relative.startsWith('..'+path.sep) && !path.isAbsolute(relative); }
  async function authorizeMovie(auth, itemId) {
    if (!auth || typeof auth.token !== 'string' || !auth.token || auth.token.length > 4096 || /[\x00-\x1f\x7f"\\]/.test(auth.token) || !safeId(itemId)) throw new Error('unauthorized');
    const user = await get('/Users/Me',auth.token);
    if (!user || !safeId(user.Id)) throw new Error('unauthorized');
    const item = await get('/Users/'+encodeURIComponent(user.Id)+'/Items/'+encodeURIComponent(itemId)+'?fields=MediaSources,Path',auth.token);
    if (!item || item.Id !== itemId || item.Type !== 'Movie') throw new Error('item unavailable');
    return {id:user.Id,item};
  }
  async function resolveSource(auth, clip) {
    if (!clip || !safeId(clip.mediaSourceId)) throw new Error('unauthorized');
    const authorized=await authorizeMovie(auth,clip.itemId), user={Id:authorized.id}, item=authorized.item;
    if (!Array.isArray(item.MediaSources)) throw new Error('item unavailable');
    const matches = item.MediaSources.filter(s=>s && s.Id===clip.mediaSourceId);
    if (matches.length !== 1 || typeof matches[0].Path !== 'string' || !path.isAbsolute(matches[0].Path) || !Array.isArray(matches[0].MediaStreams)) throw new Error('source unavailable');
    const source=matches[0], audio=source.MediaStreams.filter(s=>s && s.Type==='Audio' && s.Index===clip.audioIndex);
    if (audio.length !== 1 || !Number.isFinite(source.RunTimeTicks) || source.RunTimeTicks <= 0) throw new Error('source unavailable');
    const file=await fs.realpath(source.Path); const roots=await Promise.all(options.mediaRoots.map(root=>fs.realpath(root)));
    if (!roots.some(root=>within(root,file)) || !(await fs.stat(file)).isFile()) throw new Error('source unavailable');
    return {userId:user.Id,path:file,audioIndex:clip.audioIndex,durationSeconds:source.RunTimeTicks/10000000};
  }
  resolveSource.authorizeMovie = authorizeMovie;
  return resolveSource;
}
module.exports = {createJellyfinClipResolver};
