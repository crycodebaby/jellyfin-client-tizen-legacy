'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(onConnected, onError) {
  const calls=[], timers=[], delays=[], callbacks=[];
  const transport={request(options,cb){const h={aborted:false,abort(){this.aborted=true}};calls.push({options,cb,h});return h;}};
  const client={ isAuthenticated:()=>true, movies(start,limit,cb){callbacks.push(cb);return {abort(){}};}, searchMovies(start,a,b,cb){callbacks.push(cb);return {abort(){}};}, searchPeople(start,a,b,cb){callbacks.push(cb);return {abort(){}};}, actorMovies(start,a,b,cb){callbacks.push(cb);return {abort(){}};} };
  let plays=[];const context={window:{setTimeout(fn,delay){timers.push(fn);delays.push(delay);return timers.length;},clearTimeout(){}}};
  vm.runInNewContext(fs.readFileSync('companion-tv.js','utf8'),context);
  const bridge=context.window.SMAIRYS_PHONE.create({client,base:'http://127.0.0.1:8787',transport,onConnected,onError,onPlay(id,cb){plays.push(id);cb(true);}});
  return {calls,timers,delays,callbacks,bridge,plays};
}
function pair(s) { let result;s.bridge.pair((e,d)=>{result={e,d}});s.calls[0].cb(null,{tvToken:'a'.repeat(43),pairToken:'b'.repeat(43),expiresIn:120});assert.ok(result.d);return s.calls[1]; }
test('TV-Brücke erlaubt nur zuvor angezeigte Filme und gibt keine Zugangsdaten weiter',()=>{
 const s=setup(), poll=pair(s);
 poll.cb(null,{events:[{type:'play',id:'r0',itemId:'constructor'},{type:'browse',id:'r1',kind:'movies',query:'',start:0,limit:20}]});
 assert.equal(s.plays.length,0);assert.equal(s.callbacks.length,1);
 s.callbacks[0](null,{items:[{id:'film1',title:'Beispiel',token:'secret'}],total:1});
 const posts=s.calls.filter(c=>c.options.url.endsWith('/api/tv/events')&&c.options.method==='POST');
 const result=JSON.parse(posts.at(-1).options.body);assert.deepEqual(result.items,[{id:'film1',title:'Beispiel',kind:'movie'}]);assert.doesNotMatch(posts.at(-1).options.body,/secret/);
 s.timers.shift()();const second=s.calls.at(-1);second.cb(null,{events:[{type:'play',id:'r2',itemId:'film1'}]});
 assert.deepEqual(s.plays,['film1']);assert.equal(JSON.parse(s.calls.at(-1).options.body).ok,true);
});
test('Abmeldung verwirft alte Antworten und schließt die Kopplung',()=>{
 const s=setup(), poll=pair(s);poll.cb(null,{events:[{type:'browse',id:'r1',kind:'movies',query:'',start:0,limit:20}]});
 const count=s.calls.length;s.bridge.close();assert.equal(s.bridge.isActive(),false);assert.match(s.calls.at(-1).options.url,/\/api\/tv\/close$/);
 s.callbacks[0](null,{items:[{id:'f',title:'Film'}],total:1});assert.equal(s.calls.length,count+1);
});

test('TV meldet Kopplung und spätere Namensänderungen einmalig',()=>{
 const names=[],s=setup(name=>names.push(name)),poll=pair(s);
 poll.cb(null,{events:[],paired:true,deviceName:'iPhone'});
 s.timers.shift()();s.calls.at(-1).cb(null,{events:[],paired:true,deviceName:'iPhone'});
 s.timers.shift()();s.calls.at(-1).cb(null,{events:[],paired:true,deviceName:'iPhone 15'});
 assert.deepEqual(names,['iPhone','iPhone 15']);s.bridge.close();
});

test('Vorübergehende Verbindungsfehler werden begrenzt wiederholt und Erfolg setzt den Zähler zurück',()=>{
 let errors=0; const s=setup(null,()=>errors++),poll=pair(s);
 poll.cb({type:'network'}); assert.equal(s.bridge.isActive(),true); assert.equal(errors,0); assert.equal(s.delays.at(-1),700);
 s.timers.shift()(); s.calls.at(-1).cb({type:'timeout'}); assert.equal(s.delays.at(-1),1400);
 s.timers.shift()(); s.calls.at(-1).cb(null,{events:[],paired:true}); assert.equal(s.bridge.isActive(),true);
 s.timers.shift()(); s.calls.at(-1).cb({type:'network'}); assert.equal(s.delays.at(-1),700);
 for (let i=0;i<3;i++) { s.timers.shift()(); s.calls.at(-1).cb({type:'network'}); }
 assert.equal(s.bridge.isActive(),false); assert.equal(errors,1); assert.match(s.calls.at(-1).options.url,/\/api\/tv\/close$/);
});

test('Ungültige Berechtigung schließt sofort; ausstehender Retry nach Abmeldung startet keine Anfrage',()=>{
 for (const status of [401,403]) {
   let errors=0; const s=setup(null,()=>errors++),poll=pair(s); poll.cb({type:'http',status});
   assert.equal(errors,1); assert.equal(s.bridge.isActive(),false); assert.equal(s.timers.length,0);
 }
 const s=setup(),poll=pair(s); poll.cb({type:'timeout'}); s.bridge.close(); const count=s.calls.length;
 s.timers.shift()(); assert.equal(s.calls.length,count); assert.equal(s.bridge.isActive(),false);
});
