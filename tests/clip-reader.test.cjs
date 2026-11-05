'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {createClipReader}=require('../companion/clip-reader.cjs');
test('Clip-Wiedergabe prüft Benutzer und Filmzugriff und liest begrenzte Dateibereiche',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'smairys-play-'));try{
  const id='a'.repeat(32),dir=path.join(root,'robin','film');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,id+'.mkv'),'abcdefghij');await fs.writeFile(path.join(dir,id+'.json'),JSON.stringify({id,userId:'robin',itemId:'film',start:1,end:5,duration:4}));
  const reader=createClipReader(root,async(auth,item)=>auth==='robin'&&item==='film'?{id:'robin'}:auth==='alex'?{id:'alex'}:null);
  assert.equal((await reader.list('robin','film')).length,1);assert.deepEqual(await reader.list('alex','film'),[]);await assert.rejects(()=>reader.list('unknown','film'));await assert.rejects(()=>reader.open('alex','film',id));
  const result=await reader.open('robin','film',id,'bytes=2-5');let content='';for await(const chunk of result.stream)content+=chunk;assert.equal(content,'cdef');assert.equal(result.total,10);assert.equal(result.partial,true);
  const tail=await reader.open('robin','film',id,'bytes=-3');let ending='';for await(const chunk of tail.stream)ending+=chunk;assert.equal(ending,'hij');
  await assert.rejects(()=>reader.open('robin','film',id,'bytes=99-100'));await assert.rejects(()=>reader.open('robin','../film',id));
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
