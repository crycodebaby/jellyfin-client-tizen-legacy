'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {createClipCatalog} = require('./clip-catalog.cjs');
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const clipId = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);

// Internal reader, not exposed over HTTP. authorize must validate the session,
// return the authenticated Jellyfin user and verify access to the movie.
function createClipReader(root, authorize) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || typeof authorize !== 'function') throw new Error('invalid configuration');
  const catalog = createClipCatalog(root);
  async function list(auth,itemId) {
    if (!safeId(itemId)) throw new Error('invalid request');
    const user = await authorize(auth,itemId);
    if (!user || !safeId(user.id)) throw new Error('unauthorized');
    return catalog.list(user.id,itemId);
  }
  async function open(auth,itemId,id,range) {
    if (!safeId(itemId) || !clipId(id)) throw new Error('invalid request');
    const user = await authorize(auth,itemId);
    if (!user || !safeId(user.id)) throw new Error('unauthorized');
    if (!await catalog.read(user.id,itemId,id)) throw new Error('not found');
    const dir=await fs.realpath(path.join(root,user.id,itemId));
    const rootReal=await fs.realpath(root), relative=path.relative(rootReal,dir);
    if (!relative || relative==='..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) throw new Error('invalid location');
    const target=path.join(dir,id+'.mkv');
    const entry=await fs.lstat(target);
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error('not found');
    const handle=await fs.open(target,'r');
    try {
      const stat=await handle.stat(); let start=0,end=stat.size-1,partial=false;
      if (!stat.isFile() || stat.size<=0) throw new Error('not found');
      if (range) {
        const match=/^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match) throw new Error('invalid range');
        if (!match[1] && !match[2]) throw new Error('invalid range');
        if (!match[1]) { const suffix=Number(match[2]); if (!Number.isSafeInteger(suffix) || suffix<=0) throw new Error('invalid range'); start=Math.max(0,stat.size-suffix); }
        else { start=Number(match[1]);end=match[2]?Number(match[2]):end; }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start> end || start>=stat.size) throw new Error('invalid range');
        end=Math.min(end,stat.size-1);partial=true;
      }
      return {stream:handle.createReadStream({start,end,autoClose:true}),start,end,total:stat.size,length:end-start+1,partial};
    } catch (error) { await handle.close(); throw error; }
  }
  return {list,open};
}
module.exports={createClipReader};
