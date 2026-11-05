'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {createClipWorker}=require('../companion/clip-worker.cjs');
const {createClipCatalog}=require('../companion/clip-catalog.cjs');
const ffmpeg=process.env.SMAIRYS_TEST_FFMPEG;
const ffprobe=process.env.SMAIRYS_TEST_FFPROBE;

async function done(worker,id) {
  for(let i=0;i<200;i++){const job=worker.status(id);if(job.state==='ready'||job.state==='failed')return job;await new Promise(r=>setTimeout(r,25));}
  throw new Error('job timed out');
}
test('Clip-Worker erstellt echte Mediendatei im Benutzerordner und schützt Quelldatei', {skip:!ffmpeg||!ffprobe?'FFmpeg und FFprobe nicht konfiguriert':false}, async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'smairys-clip-'));
  try {
    const source=path.join(temp,'source.mkv'),root=path.join(temp,'clips');
    const generated=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc=size=96x64:rate=10','-f','lavfi','-i','sine=frequency=440','-t','4','-c:v','mpeg4','-g','10','-c:a','pcm_s16le',source],{windowsHide:true});
    assert.equal(generated.status,0,'Synthetisches Video erzeugt');
    const original=await fs.readFile(source);
    const worker=createClipWorker({root,ffmpeg,ffprobe,resolveSource:async auth=>{assert.equal(auth,'validated-session');return {userId:'user-a',path:source,audioIndex:1,durationSeconds:4};}});
    const id=worker.submit('validated-session',{itemId:'film-a',mediaSourceId:'source-a',audioIndex:1,start:1,end:3});
    assert.equal((await done(worker,id)).state,'ready');
    const meta=JSON.parse(await fs.readFile(path.join(root,'user-a','film-a',id+'.json'),'utf8'));
    assert.equal(meta.userId,'user-a');assert.equal(meta.itemId,'film-a');assert.equal(meta.start,1);assert.ok(meta.duration>0&&meta.duration<=4);
    assert.ok((await fs.stat(path.join(root,'user-a','film-a',id+'.mkv'))).size>0);
    const decode=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-i',path.join(root,'user-a','film-a',id+'.mkv'),'-f','null','-'],{windowsHide:true});
    assert.equal(decode.status,0,'Exportierter Clip lässt sich dekodieren');
    const catalog=createClipCatalog(root);
    assert.equal((await catalog.list('user-a','film-a'))[0].id,id);
    assert.deepEqual(await catalog.list('user-b','film-a'),[]);
    assert.deepEqual(await fs.readFile(source),original);
    assert.deepEqual((await fs.readdir(path.join(root,'user-a','film-a'))).sort(),[id+'.json',id+'.mkv']);
  } finally {await fs.rm(temp,{recursive:true,force:true});}
});
test('Clip-Worker lehnt fremde Felder, ungültige Grenzen und manipulierte Kennungen ab',()=>{
  const worker=createClipWorker({root:path.resolve('clip-test-output'),ffmpeg:path.resolve('ffmpeg'),ffprobe:path.resolve('ffprobe'),resolveSource:async()=>null});
  const valid={itemId:'film',mediaSourceId:'source',audioIndex:1,start:1,end:2};
  for(const item of [{...valid,itemId:'../x'},{...valid,start:2,end:1},{...valid,end:302},{...valid,path:'x'},{...valid,start:NaN}])assert.throws(()=>worker.submit('session',item));
  assert.throws(()=>worker.submit(null,valid));
});
test('Fehlerhafte oder nicht autorisierte Quelle erzeugt keinen Clip',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'smairys-rejected-'));
  try {const worker=createClipWorker({root:temp,ffmpeg:path.resolve('ffmpeg'),ffprobe:path.resolve('ffprobe'),resolveSource:async()=>{throw Error('unauthorized')}});const id=worker.submit('session',{itemId:'film',mediaSourceId:'source',audioIndex:1,start:0,end:2});assert.equal((await done(worker,id)).state,'failed');assert.deepEqual(await fs.readdir(temp),[]);} finally {await fs.rm(temp,{recursive:true,force:true});}
});
