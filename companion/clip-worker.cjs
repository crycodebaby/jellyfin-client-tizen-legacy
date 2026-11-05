'use strict';

// Internal worker: callers must authenticate and resolve the source via Jellyfin.
// This module does not expose an HTTP endpoint or accept paths from a TV.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { spawn } = require('node:child_process');

const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
function createClipWorker(options) {
  const root = path.resolve(options.root);
  const ffmpeg = options.ffmpeg;
  const ffprobe = options.ffprobe;
  const resolveSource = options.resolveSource;
  let active = false;
  const queue = [];
  const jobs = new Map();
  if (!path.isAbsolute(options.root) || !path.isAbsolute(ffmpeg) || !path.isAbsolute(ffprobe) || typeof resolveSource !== 'function') throw new Error('invalid configuration');

  function run(exe, args, capture) {
    return new Promise((resolve, reject) => {
      const child = spawn(exe, args, {windowsHide:true, stdio:['ignore', capture ? 'pipe' : 'ignore', 'ignore']});
      try { if (child.pid) os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (_) {}
      let data = '', done = false;
      const timeout = setTimeout(() => { child.kill(); finish(new Error('process timeout')); }, 120000);
      function finish(error) { if (done) return; done = true; clearTimeout(timeout); error ? reject(error) : resolve(data); }
      if (capture) child.stdout.on('data', chunk => { data += chunk; if (data.length > 131072) { child.kill(); finish(new Error('probe output too large')); } });
      child.on('error', () => finish(new Error('process unavailable')));
      child.on('close', code => finish(code === 0 ? null : new Error('process failed')));
    });
  }
  async function processJob(job, auth) {
    let temporary = '', metadataTemp = '', output = '', metadataOutput = '', published = false, publishedMetadata = false;
    try {
      // The resolver verifies the Jellyfin token, user access, selected media source and local path.
      const source = await resolveSource(auth, job.request);
      if (!source || !safeId(source.userId) || typeof source.path !== 'string' || !path.isAbsolute(source.path) || source.audioIndex !== job.request.audioIndex || !Number.isFinite(source.durationSeconds) || source.durationSeconds <= 0 || job.request.end > source.durationSeconds) throw new Error('source unavailable');
      const dir = path.join(root, source.userId, job.request.itemId);
      await fs.mkdir(dir, {recursive:true});
      const name = job.id;
      output = path.join(dir, name + '.mkv');
      metadataOutput = path.join(dir, name + '.json');
      temporary = path.join(dir, name + '.partial.mkv');
      metadataTemp = path.join(dir, name + '.partial.json');
      job.state = 'processing';
      await run(ffmpeg, ['-nostdin','-hide_banner','-loglevel','error','-n','-protocol_whitelist','file,pipe','-ss',String(job.request.start),'-i',source.path,'-t',String(job.request.end-job.request.start),'-map','0:v:0','-map','0:'+source.audioIndex,'-c','copy',temporary], false);
      const probe = JSON.parse(await run(ffprobe, ['-v','error','-protocol_whitelist','file,pipe','-show_entries','format=duration:stream=codec_type','-of','json',temporary], true));
      const duration = Number(probe && probe.format && probe.format.duration);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 310 || !Array.isArray(probe.streams) || !probe.streams.some(s=>s.codec_type==='video') || !probe.streams.some(s=>s.codec_type==='audio')) throw new Error('invalid output');
      const meta = {id:name,userId:source.userId,itemId:job.request.itemId,mediaSourceId:job.request.mediaSourceId,start:job.request.start,end:job.request.end,duration:duration,audioIndex:source.audioIndex,createdAt:new Date().toISOString()};
      await fs.writeFile(metadataTemp, JSON.stringify(meta), {flag:'wx'});
      await fs.link(temporary, output); published = true;
      await fs.unlink(temporary); temporary = '';
      await fs.link(metadataTemp, metadataOutput); publishedMetadata = true;
      await fs.unlink(metadataTemp); metadataTemp = '';
      job.state = 'ready'; job.owner = source.userId;
    } catch (_) {
      job.state = 'failed';
      if (published) await fs.unlink(output).catch(()=>{});
      if (publishedMetadata) await fs.unlink(metadataOutput).catch(()=>{});
    } finally {
      if (temporary) await fs.unlink(temporary).catch(()=>{});
      if (metadataTemp) await fs.unlink(metadataTemp).catch(()=>{});
      auth = null;
    }
  }
  async function drain() {
    if (active || !queue.length) return;
    active = true;
    const next = queue.shift();
    try { await processJob(next.job, next.auth); } finally { active = false; if (queue.length) setImmediate(drain); }
  }
  function submit(auth, request) {
    if (!auth || !request || !safeId(request.itemId) || !safeId(request.mediaSourceId) || !Number.isInteger(request.audioIndex) || request.audioIndex < 0 || request.audioIndex > 1024 || !Number.isFinite(request.start) || !Number.isFinite(request.end) || request.start < 0 || request.end <= request.start || request.end-request.start > 300 || Object.keys(request).some(k=>!['itemId','mediaSourceId','audioIndex','start','end'].includes(k))) throw new Error('invalid request');
    if (jobs.size >= 100) { for (const [id,old] of jobs) { if (old.state === 'ready' || old.state === 'failed') { jobs.delete(id); break; } } }
    if (queue.length >= 5 || jobs.size >= 100) throw new Error('queue full');
    const job = {id:crypto.randomBytes(16).toString('hex'),request:{itemId:request.itemId,mediaSourceId:request.mediaSourceId,audioIndex:request.audioIndex,start:request.start,end:request.end},state:'queued'};
    jobs.set(job.id,job); queue.push({job,auth}); setImmediate(drain); return job.id;
  }
  // This internal status accessor must only be exposed behind an authenticated owner check.
  function status(id) { const job = jobs.get(id); return job ? {id:job.id,state:job.state,owner:job.owner || '',requestItemId:job.request.itemId} : null; }
  return {submit,status};
}
module.exports = {createClipWorker};
