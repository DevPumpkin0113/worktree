import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const packageName='@devpumpkin0113/worktree-cli';
export function verifyCliPack(manifest, pack, directory) {
 if(manifest.name!==packageName || pack.name!==packageName || pack.version!==manifest.version)throw Error('Unexpected CLI package identity/version');
 const filename=`devpumpkin0113-worktree-cli-${manifest.version}.tgz`;
 if(pack.filename!==filename)throw Error('Unexpected package filename');
 const expected=['README.md','README.ko.md','dist/main.js','dist/worktree-store.exe','package.json'];
 if(JSON.stringify(pack.files.map(f=>f.path).sort())!==JSON.stringify(expected.sort()))throw Error('Unexpected package contents');
 if(manifest.dependencies && Object.keys(manifest.dependencies).length)throw Error('CLI must bundle its runtime dependencies');
 const archive=path.join(directory,filename);
 if(pack.integrity!=='sha512-'+createHash('sha512').update(fs.readFileSync(archive)).digest('base64'))throw Error('Package integrity mismatch');
 return archive;
}
export async function assertUnpublished(manifest, request=fetch) {
 if(manifest.name!==packageName)throw Error('Unexpected CLI package name');
 const response=await request(`https://registry.npmjs.org/${encodeURIComponent(manifest.name)}/${encodeURIComponent(manifest.version)}`,{signal:AbortSignal.timeout(30000)});
 if(response.status===404)return;
 if(response.status===200)throw Error('CLI version is already published; increment its version');
 throw Error('Could not check npm registry: HTTP '+response.status);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const manifest=JSON.parse(fs.readFileSync('apps/cli/package.json','utf8'));
 if(process.argv[2]==='--registry')await assertUnpublished(manifest);
 else {
  const report=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
  if(!Array.isArray(report)||report.length!==1)throw Error('Expected one npm package');
  console.log(verifyCliPack(manifest,report[0],path.dirname(process.argv[2])));
 }
}
