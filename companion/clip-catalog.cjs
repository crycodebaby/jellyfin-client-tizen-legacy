'use strict';

// Internal catalog. The caller must first obtain the owner from Jellyfin and
// authorize access to the movie; these functions are not an HTTP interface.
const fs = require('node:fs/promises');
const path = require('node:path');
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const clipId = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);

function createClipCatalog(root) {
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error('invalid configuration');
  async function folderFor(owner,itemId) {
    const rootReal=await fs.realpath(root),folder=await fs.realpath(path.join(rootReal,owner,itemId));
    const relative=path.relative(rootReal,folder),expected=path.join(owner,itemId);
    if ((process.platform==='win32' ? relative.toLowerCase() : relative) !== (process.platform==='win32' ? expected.toLowerCase() : expected)) throw new Error('invalid location');
    return folder;
  }
  async function read(owner, itemId, id) {
    if (!safeId(owner) || !safeId(itemId) || !clipId(id)) throw new Error('invalid request');
    let metadata;
    try {
      const folder = await folderFor(owner,itemId);
      const metadataPath = path.join(folder, id + '.json');
      const metaInfo = await fs.lstat(metadataPath);
      if (!metaInfo.isFile() || metaInfo.isSymbolicLink() || metaInfo.size > 8192) return null;
      const content = await fs.readFile(metadataPath, 'utf8');
      if (content.length > 8192) return null;
      metadata = JSON.parse(content);
      if (!metadata || metadata.id !== id || metadata.userId !== owner || metadata.itemId !== itemId || !Number.isFinite(metadata.duration) || metadata.duration <= 0 || metadata.duration > 310 || !Number.isFinite(metadata.start) || !Number.isFinite(metadata.end) || metadata.start < 0 || metadata.end <= metadata.start) return null;
      const info = await fs.lstat(path.join(folder, id + '.mkv'));
      if (!info.isFile() || info.isSymbolicLink() || !info.size) return null;
    } catch (_) { return null; }
    return {id:metadata.id,itemId:metadata.itemId,start:metadata.start,end:metadata.end,duration:metadata.duration,createdAt:typeof metadata.createdAt === 'string' ? metadata.createdAt : ''};
  }
  async function list(owner, itemId) {
    if (!safeId(owner) || !safeId(itemId)) throw new Error('invalid request');
    let names;
    try { names=await fs.readdir(await folderFor(owner,itemId)); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const ids=names.filter(name=>/^[a-f0-9]{32}\.json$/.test(name)).slice(0,500).map(name=>name.slice(0,-5));
    const items=(await Promise.all(ids.map(id=>read(owner,itemId,id)))).filter(Boolean);
    items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    return items;
  }
  return {read,list};
}
module.exports = {createClipCatalog};
