import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const write=(p,text)=>fs.writeFileSync(new URL(p,root),text);
const pkg=JSON.parse(read('package.json'));
const config=JSON.parse(read('src-tauri/tauri.conf.json'));
const lock=JSON.parse(read('package-lock.json'));
const cargo=read('src-tauri/Cargo.toml');
const cargoVersion=cargo.match(/\[package\][\s\S]*?^version = "([^"]+)"/m)?.[1];
const next=process.argv[2];
if(next==='--check'){
 const cargoLock=read('src-tauri/Cargo.lock');
 const own=cargoLock.split('[[package]]').find(block=>block.includes('name = "'+pkg.name+'"'));
 const rustLock=own?.match(/^version = "([^"]+)"/m)?.[1];
 if(![config.version,lock.version,lock.packages[''].version,cargoVersion,rustLock].every(v=>v===pkg.version))throw Error('버전 불일치: package.json, npm lock, Tauri, Cargo 및 Cargo lock을 확인하세요.');
 console.log('Version synchronized: '+pkg.version);
}else{
 if(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(next||''))throw Error('사용법: npm run version:set -- 0.2.1');
 pkg.version=next;config.version=next;lock.version=next;lock.packages[''].version=next;
 write('package.json',JSON.stringify(pkg,null,2)+'\n');write('package-lock.json',JSON.stringify(lock,null,2)+'\n');write('src-tauri/tauri.conf.json',JSON.stringify(config,null,2)+'\n');
 write('src-tauri/Cargo.toml',cargo.replace(/(\[package\][\s\S]*?^version = ")[^"]+(".*$)/m,'$1'+next+'$2'));
 const cargoLock=read('src-tauri/Cargo.lock');
 write('src-tauri/Cargo.lock',cargoLock.split('[[package]]').map(block=>block.includes('name = "'+pkg.name+'"')?block.replace(/^version = "[^"]+"/m,'version = "'+next+'"'):block).join('[[package]]'));
 console.log('Version updated: '+next+'; CHANGELOG.md도 갱신하세요.');
}
