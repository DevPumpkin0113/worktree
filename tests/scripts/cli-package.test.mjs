import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyCliPack,assertUnpublished,packageName} from '../../scripts/verify-cli-package.mjs';
test('npm archive verification checks identity, exact contents and bytes',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'worktree-npm-pack-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const manifest={name:packageName,version:'0.4.1'},filename='devpumpkin0113-worktree-cli-0.4.1.tgz';fs.writeFileSync(path.join(root,filename),'archive');const pack={...manifest,filename,integrity:'sha512-'+createHash('sha512').update('archive').digest('base64'),files:['README.md','README.ko.md','dist/main.js','dist/worktree-store.exe','package.json'].map(path=>({path}))};assert.equal(verifyCliPack(manifest,pack,root),path.join(root,filename));
 for(const patch of [{name:'other'},{version:'0.0.0'},{filename:'../bad.tgz'},{files:[...pack.files,{path:'.npmrc'}]},{integrity:'wrong'}])assert.throws(()=>verifyCliPack(manifest,{...pack,...patch},root));
});
test('npm lookup only accepts a missing version and refuses registry failures',async()=>{
 const manifest={name:packageName,version:'0.4.1'};await assertUnpublished(manifest,async()=>({status:404}));for(const status of [200,401,500])await assert.rejects(assertUnpublished(manifest,async()=>({status})));await assert.rejects(assertUnpublished(manifest,async()=>{throw Error('offline');}));
});
