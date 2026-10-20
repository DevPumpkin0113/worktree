import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function createUpdateManifest({version,signature,notes='',publishedAt=new Date().toISOString()}){
 if(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))throw new Error('Invalid release version');
 if(!signature?.trim()||!Number.isFinite(Date.parse(publishedAt)))throw new Error('Signature and publication date are required');
 return {version,notes,pub_date:publishedAt,platforms:{'windows-x86_64':{signature:signature.trim(),url:`https://github.com/DevPumpkin0113/worktree/releases/download/v${version}/Worktree_${version}_x64-setup.exe`}}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const {version}=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const directory=path.join(root,'src-tauri/target/release/bundle/nsis');
 const installer=path.join(directory,`Worktree_${version}_x64-setup.exe`);
 if(!fs.statSync(installer).isFile())throw new Error('Installer missing');
 const signature=fs.readFileSync(installer+'.sig','utf8');
 const changelog=fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8');
 const section=heading=>changelog.split(heading)[1]?.split(/\r?\n## \[/)[0].trim();
 const notes=section('## [Unreleased]')||section(`## [${version}]`)||`Worktree ${version}`;
 fs.writeFileSync(path.join(directory,'latest.json'),JSON.stringify(createUpdateManifest({version,signature,notes}),null,2)+'\n');
 console.log(`Generated signed update manifest for ${version}`);
}
