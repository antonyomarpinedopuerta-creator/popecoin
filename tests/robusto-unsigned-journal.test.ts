import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {initializeFixtureJournal,openFixtureJournal} from '../scripts/robusto-unsigned-journal';
const digest='a'.repeat(64);
function setup(){const parent=fs.mkdtempSync(path.join(os.tmpdir(),'robusto-journal-fixture-'));const root=path.join(parent,'journal');initializeFixtureJournal(root);return {parent,root};}
const childCode=`const j=require('./scripts/robusto-unsigned-journal');try{j.openFixtureJournal(process.argv[1]).reserve(process.argv[2]);process.stdout.write('RESERVED');}catch(e){process.stdout.write('REJECTED');process.exitCode=23;}`;
function child(root:string){return new Promise<string>((resolve,reject)=>{
 const p=spawn(process.execPath,['--require','ts-node/register','-e',childCode,root,digest],{cwd:process.cwd()});let out='';let err='';
 p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',code=>code===0||code===23?resolve(code===0?'RESERVED':'REJECTED'):reject(Error(err)));
});}
test('persistent reservation survives a fresh process and contains only digest/state',()=>{
 const {parent,root}=setup();try{
  openFixtureJournal(root).reserve(digest);
  const result=spawnSync(process.execPath,['--require','ts-node/register','-e',childCode,root,digest],{encoding:'utf8'});
  assert.equal(result.status,23,result.stderr);
  const record=JSON.parse(fs.readFileSync(path.join(root,digest,'record.json'),'utf8'));
  assert.deepEqual(Object.keys(record).sort(),['authorization','format','messageSha256','state']);
  assert.equal(record.authorization,false);assert.equal(record.state,'CONSUMED_NOT_AUTHORIZED');
  assert.equal(fs.statSync(path.join(root,digest,'record.json')).mode&0o777,0o600);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
test('two independent processes atomically compete for one permanent reservation',async()=>{
 const {parent,root}=setup();try{assert.deepEqual((await Promise.all([child(root),child(root)])).sort(),['REJECTED','RESERVED']);}
 finally{fs.rmSync(parent,{recursive:true,force:true});}
});
test('missing, partial, corrupt and symlink claims remain blocked without repairs',()=>{
 for(const kind of ['empty','partial','corrupt','symlink']){
  const {parent,root}=setup();try{
   const claim=path.join(root,digest);
   if(kind==='symlink')fs.symlinkSync(parent,claim);else{
    fs.mkdirSync(claim,{mode:0o700});
    if(kind==='partial')fs.writeFileSync(path.join(claim,'record.pending'),'{',{mode:0o600});
    if(kind==='corrupt')fs.writeFileSync(path.join(claim,'record.json'),'garbage',{mode:0o600});
   }
   assert.throws(()=>openFixtureJournal(root).reserve(digest),/Duplicate or uncertain/);
   assert(fs.lstatSync(claim));
  }finally{fs.rmSync(parent,{recursive:true,force:true});}
 }
});
test('corrupt root, unsafe permissions and symlinks fail closed; initialization never replaces existing files',()=>{
 const {parent,root}=setup();try{
  assert.throws(()=>initializeFixtureJournal(root));
  fs.writeFileSync(path.join(root,'record.json'),'{');assert.throws(()=>openFixtureJournal(root));
  fs.unlinkSync(path.join(root,'record.json'));assert.throws(()=>openFixtureJournal(root));
  const other=path.join(parent,'other');initializeFixtureJournal(other);
  fs.chmodSync(other,0o755);assert.throws(()=>openFixtureJournal(other),/Unsafe/);
  fs.symlinkSync(other,path.join(parent,'link'));assert.throws(()=>openFixtureJournal(path.join(parent,'link')),/Unsafe/);
  assert.throws(()=>openFixtureJournal(path.join(parent,'absent')));
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
test('process crash before atomic rename leaves incomplete claim blocked after restart',()=>{
 const {parent,root}=setup();try{
  const code=`const fs=require('node:fs');const j=require('./scripts/robusto-unsigned-journal');fs.renameSync=()=>process.exit(19);j.openFixtureJournal(process.argv[1]).reserve(process.argv[2]);`;
  const result=spawnSync(process.execPath,['--require','ts-node/register','-e',code,root,digest]);
  assert.equal(result.status,19);
  assert(fs.existsSync(path.join(root,digest,'record.pending')));
  assert(!fs.existsSync(path.join(root,digest,'record.json')));
  assert.throws(()=>openFixtureJournal(root).reserve(digest),/Duplicate or uncertain/);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});

test('failed durability barrier leaves a blocked reservation and incomplete initialization cannot reopen',()=>{
 const {parent,root}=setup();const original=fs.fsyncSync;
 try{
  fs.fsyncSync=()=>{throw Error('fixture fsync failure');};
  assert.throws(()=>openFixtureJournal(root).reserve(digest),/fsync failure/);
  fs.fsyncSync=original;
  assert.throws(()=>openFixtureJournal(root).reserve(digest),/Duplicate or uncertain/);
  const incomplete=path.join(parent,'incomplete');fs.mkdirSync(incomplete,{mode:0o700});
  fs.writeFileSync(path.join(incomplete,'record.pending'),'{',{mode:0o600});
  assert.throws(()=>openFixtureJournal(incomplete));assert.throws(()=>initializeFixtureJournal(incomplete));
 }finally{fs.fsyncSync=original;fs.rmSync(parent,{recursive:true,force:true});}
});
