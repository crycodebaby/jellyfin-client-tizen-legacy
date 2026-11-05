'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {createClipCatalog}=require('../companion/clip-catalog.cjs');
test('Persönliche Clipliste zeigt nur vollständige Clips des angefragten Besitzers und Films',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'smairys-catalog-'));try{
  const a='a'.repeat(32),b='b'.repeat(32),bad='c'.repeat(32);
  for(const [owner,id] of [['robin',a],['alex',b],['robin',bad]]){const dir=path.join(root,owner,'movie');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,id+'.json'),JSON.stringify({id,userId:owner,itemId:'movie',start:1,end:5,duration:4,createdAt:'2026-01-01'}));if(id!==bad)await fs.writeFile(path.join(dir,id+'.mkv'),'video');}
  const catalog=createClipCatalog(root);assert.deepEqual((await catalog.list('robin','movie')).map(x=>x.id),[a]);assert.deepEqual((await catalog.list('alex','movie')).map(x=>x.id),[b]);assert.equal(await catalog.read('alex','movie',a),null);assert.deepEqual(await catalog.list('robin','other'),[]);await assert.rejects(()=>catalog.list('../alex','movie'));
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
