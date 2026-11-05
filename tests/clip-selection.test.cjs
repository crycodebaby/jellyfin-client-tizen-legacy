'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const acorn=require('acorn');
const text=fs.readFileSync(require('node:path').join(__dirname,'../clip-selection.js'),'utf8');const scope={window:{}};vm.runInNewContext(text,scope);const create=scope.window.SMAIRYS_CLIP_SELECTION.create;
test('Clip-Auswahl bleibt ES5 und markiert begrenzte Ausschnitte ohne Playeroperationen',()=>{
 acorn.parse(text,{ecmaVersion:5});const s=create(1000,120);assert.equal(s.mark().state.start,120);s.move(12.5);const result=s.mark();assert.equal(result.ok,true);assert.equal(result.state.end,132.5);assert.equal(result.state.ready,true);
 s.move(-999);assert.equal(s.snapshot().position,0);assert.equal(s.mark().state.start,0);s.move(301);assert.equal(s.mark().reason,'too-long');s.move(-301);assert.equal(s.mark().reason,'end-before-start');s.move(1000);assert.equal(s.snapshot().position,1000);
});
test('Ungültige Videoposition wird abgewiesen',()=>{assert.throws(()=>create(0,0));assert.throws(()=>create(5,6));assert.throws(()=>create(5,NaN));});
