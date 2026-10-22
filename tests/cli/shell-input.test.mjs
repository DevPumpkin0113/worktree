import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tokenize} from '../../apps/cli/src/shell.ts';
import {table} from '../../apps/cli/src/table.ts';
test('콘솔 인수는 Windows 경로·빈 문자열·SQL식 따옴표를 유지한다',()=>{
 assert.deepEqual(tokenize('use "C:\\project folder\\"'),['use','C:\\project folder\\']);
 assert.deepEqual(tokenize('comment add W001 --text "확인한 ""내용"""'),['comment','add','W001','--text','확인한 "내용"']);
 assert.deepEqual(tokenize("task edit W001 --description ''"),['task','edit','W001','--description','']);
 assert.throws(()=>tokenize('task add --title "닫히지 않음'));
});
test('문자 표는 제어 문자를 제거하고 한글 열 너비와 긴 값의 제한을 적용한다',()=>{
 const result=table(['ID','제목'],[['W001','한글 제목'],['W002','\u001b[31m'+'가'.repeat(70)+'\n다음 행']]);
 assert.doesNotMatch(result,/\u001b/);assert.ok(result.includes('…'));assert.equal(result.split('\n').length,6);assert.ok(result.includes('한글 제목'));
});
