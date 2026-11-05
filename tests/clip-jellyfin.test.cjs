'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
const {createJellyfinClipResolver}=require('../companion/clip-jellyfin.cjs');
test('Clip-Quelle verwendet serverseitige Benutzer- und Filmrechte, Medienfassung und erlaubte Verzeichnisse',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'smairys-source-'));try{
  const root=path.join(temp,'movies');await fs.mkdir(root);const file=path.join(root,'movie.mkv');await fs.writeFile(file,'fixture');let deny=false,selected=file,requested=[];
  const fake=async(url,opts)=>{requested.push(url);assert.match(opts.headers.Authorization,/Token=/);if(deny)return {ok:false};return {ok:true,json:async()=>url.endsWith('/Users/Me')?{Id:'user-a'}:{Id:'film',Type:'Movie',MediaSources:[{Id:'source',Path:selected,RunTimeTicks:40000000,MediaStreams:[{Type:'Video',Index:0},{Type:'Audio',Index:1}]}]}}};
  const resolve=createJellyfinClipResolver({server:'http://127.0.0.1:8096',mediaRoots:[root],fetch:fake});const clip={itemId:'film',mediaSourceId:'source',audioIndex:1,start:1,end:2};
  const found=await resolve({token:'session-token'},clip);assert.equal(found.userId,'user-a');assert.equal(found.path,await fs.realpath(file));assert.equal(found.durationSeconds,4);assert.match(requested[1],/\/Users\/user-a\/Items\/film/);
  await assert.rejects(()=>resolve({token:'session-token'},{...clip,mediaSourceId:'other'}));await assert.rejects(()=>resolve({token:'session-token'},{...clip,audioIndex:0}));
  const outside=path.join(temp,'outside.mkv');await fs.writeFile(outside,'fixture');selected=outside;await assert.rejects(()=>resolve({token:'session-token'},clip));
  deny=true;await assert.rejects(()=>resolve({token:'session-token'},clip));await assert.rejects(()=>resolve({token:'bad\nvalue'},clip));
 }finally{await fs.rm(temp,{recursive:true,force:true})}
});
