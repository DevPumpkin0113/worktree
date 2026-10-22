import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { manageVersion } from '../../scripts/version.mjs';
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-versions-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const files=['package.json','package-lock.json','apps/desktop/package.json','apps/cli/package.json','packages/core/package.json','apps/desktop/src-tauri/tauri.conf.json',...['apps/desktop/src-tauri','apps/cli/native','packages/storage'].flatMap(p=>[p+'/Cargo.toml',p+'/Cargo.lock'])];
 for(const file of files){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
 return {root,read:file=>fs.readFileSync(path.join(root,file),'utf8')};
}
test('CLI version changes do not change app, updater or shared package versions',t=>{
 const {root,read}=fixture(t);const files=['apps/desktop/package.json','apps/desktop/src-tauri/tauri.conf.json','apps/desktop/src-tauri/Cargo.toml','packages/core/package.json','packages/storage/Cargo.toml'];const before=files.map(read);
 manageVersion(root,'cli','0.2.0');assert.equal(JSON.parse(read('apps/cli/package.json')).version,'0.2.0');assert.deepEqual(files.map(read),before);manageVersion(root,'--check');
 assert.throws(()=>manageVersion(root,'0.3.0'));assert.throws(()=>manageVersion(root,'app','invalid'));
});
test('App version changes preserve CLI and detect mismatched Tauri metadata',t=>{
 const {root,read}=fixture(t);const before=read('apps/cli/package.json');manageVersion(root,'app','0.34.0');assert.equal(read('apps/cli/package.json'),before);assert.equal(JSON.parse(read('apps/desktop/src-tauri/tauri.conf.json')).version,'0.34.0');manageVersion(root,'--check');
 const config=JSON.parse(read('apps/desktop/src-tauri/tauri.conf.json'));config.version='9.9.9';fs.writeFileSync(path.join(root,'apps/desktop/src-tauri/tauri.conf.json'),JSON.stringify(config));assert.throws(()=>manageVersion(root,'--check'),/Tauri/);
});
import {spawnSync} from 'node:child_process';
test('updater uses desktop version and excludes CLI release notes',t=>{
 const {root,read}=fixture(t);const directory=path.join(root,'apps/desktop/src-tauri/target/release/bundle/nsis');fs.mkdirSync(directory,{recursive:true});
 const version=JSON.parse(read('apps/desktop/package.json')).version;
 const installer=path.join(directory,`Worktree_${version}_x64-setup.exe`);fs.writeFileSync(installer,'fixture');fs.writeFileSync(installer+'.sig','fixture-signature');
 fs.mkdirSync(path.join(root,'scripts'));fs.copyFileSync('scripts/update-manifest.mjs',path.join(root,'scripts/update-manifest.mjs'));
 fs.writeFileSync(path.join(root,'CHANGELOG.md'),'## [App Unreleased]\n\nApp only\n\n## [CLI Unreleased] - 0.1.0\n\nCLI only\n');
 const result=spawnSync(process.execPath,[path.join(root,'scripts/update-manifest.mjs')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'latest.json'),'utf8'));assert.equal(manifest.version,version);assert.equal(manifest.notes,'App only');assert.match(manifest.platforms['windows-x86_64'].url,new RegExp('/v'+version+'/'));
});
