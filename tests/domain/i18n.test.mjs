import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ko} from '../../apps/desktop/src/i18n/ko.ts';
import {en} from '../../apps/desktop/src/i18n/en.ts';
import {messages} from '../../apps/desktop/src/i18n/messages.ts';

test('영어 리소스는 한국어 키와 포맷 인자를 보존하고 기본 언어를 변경하지 않는다',()=>{
 assert.deepEqual(Object.keys(en).sort(),Object.keys(ko).sort());
 assert.equal(messages,ko);
 for(const key of Object.keys(ko)){
  assert.equal(typeof en[key],typeof ko[key],key);
  if(typeof ko[key]==='function'){
   assert.equal(en[key].length,ko[key].length,key);
   const args=Array.from({length:ko[key].length},(_,index)=>`ARG_TOKEN_${index}`);
   const formatted=en[key](...args);
   for(const arg of args)assert.ok(formatted.includes(arg),`${key}: ${arg}`);
  }else{
   if(key!=='countSuffix')assert.ok(en[key].trim().length,key);
   if(!['sampleAuthor','sectionFixHint','koreanLanguage'].includes(key))assert.doesNotMatch(en[key],/[가-힣]/,key);
  }
 }
 assert.equal(en.sampleAuthor,ko.sampleAuthor);
 assert.ok(en.projectFieldHint.includes('field'));
});

test('Rust 영어 리소스도 한국어 상수·포맷 함수 목록과 일치한다',()=>{
 const entries=locale=>[...fs.readFileSync(new URL(`../../apps/desktop/src-tauri/src/i18n/${locale}.rs`,import.meta.url),'utf8').matchAll(/pub (const|fn) (\w+)/g)].map(match=>`${match[1]}:${match[2]}`).sort();
 assert.deepEqual(entries('en'),entries('ko'));
});
