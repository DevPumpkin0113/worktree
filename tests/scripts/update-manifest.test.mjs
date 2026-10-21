import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUpdateManifest} from '../../scripts/update-manifest.mjs';
test('업데이트 manifest는 버전과 Windows x64 설치 파일·서명을 연결한다',()=>{
 const result=createUpdateManifest({version:'0.5.0',signature:' signed-data\n',publishedAt:'2026-10-20T00:00:00Z'});
 assert.equal(result.platforms['windows-x86_64'].signature,'signed-data');assert.match(result.platforms['windows-x86_64'].url,/v0\.5\.0\/Worktree_0\.5\.0_x64-setup\.exe$/);
 assert.throws(()=>createUpdateManifest({version:'0.5.0',signature:''}));assert.throws(()=>createUpdateManifest({version:'../x',signature:'data'}));assert.throws(()=>createUpdateManifest({version:'0.5.0',signature:'data',publishedAt:'bad'}));
});
