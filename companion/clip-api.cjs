'use strict';
const crypto=require('node:crypto');
const {createClipWorker}=require('./clip-worker.cjs');
const {createClipReader}=require('./clip-reader.cjs');
const {createJellyfinClipResolver}=require('./clip-jellyfin.cjs');

// Internal API; transport and origin enforcement are supplied by the caller.
function createClipApi(options) {
  const resolver=createJellyfinClipResolver(options);
  const worker=createClipWorker({root:options.root,ffmpeg:options.ffmpeg,ffprobe:options.ffprobe,resolveSource:resolver});
  const reader=createClipReader(options.root,async(auth,itemId)=>{const user=await resolver.authorizeMovie(auth,itemId);return {id:user.id};});
  const owners=new Map(),tickets=new Map();
  const now=options.now||Date.now;
  function clean(){for(const [id,t] of tickets)if(t.expires<=now())tickets.delete(id);for(const [id,j] of owners)if(j.expires<=now())owners.delete(id);}
  async function submit(auth,body){
    clean(); if(!body || typeof body!=='object')throw Error('invalid');
    const user=await resolver.authorizeMovie(auth,body.itemId);
    const id=worker.submit(auth,body);owners.set(id,{id:user.id,expires:now()+3600000});return {id};
  }
  async function status(auth,itemId,id){
    clean();const user=await resolver.authorizeMovie(auth,itemId),owner=owners.get(id),job=worker.status(id);
    if(!owner||!job||owner.id!==user.id||job.requestItemId!==itemId)throw Error('not found');
    return {id:job.id,state:job.state};
  }
  async function list(auth,itemId){return reader.list(auth,itemId);}
  async function ticket(auth,itemId,id,peer){
    clean();if(tickets.size>=100)throw Error('busy');
    const probe=await reader.open(auth,itemId,id);probe.stream.destroy();
    const key=crypto.randomBytes(32).toString('base64url');tickets.set(key,{auth:{token:auth.token},itemId,id,peer,expires:now()+600000});return {ticket:key};
  }
  async function open(key,peer,range){
    clean();const ticket=tickets.get(key);if(!ticket||ticket.peer!==peer)throw Error('unauthorized');
    return reader.open(ticket.auth,ticket.itemId,ticket.id,range);
  }
  return {submit,status,list,ticket,open};
}
module.exports={createClipApi};
