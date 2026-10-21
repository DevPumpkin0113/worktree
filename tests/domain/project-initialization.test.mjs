import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validTaskPrefix, validInitializationDirectory, splitInitializationDirectory } from '../../src/domain/project-initialization.ts';
test('초기화 접두어는 대문자 길이와 예약어·문자 범위를 검사한다',()=>{
 for(const value of ['W','DEV','MSA','A'.repeat(20)])assert.equal(validTaskPrefix(value),true,value);
 for(const value of ['', 'MS','ms','W1','W-',' W','W ','ß','개발','A'.repeat(21)])assert.equal(validTaskPrefix(value),false,value);
});
test('초기화 경로는 내부 상대 경로만 허용하고 이름을 분리한다',()=>{
 for(const value of ['docs/worktree','worktree','docs/custom/new'])assert.equal(validInitializationDirectory(value),true,value);
 for(const value of ['','/outside','../outside','docs/../outside','C:/outside','docs\\data','docs/','docs//data','docs/con','docs/NUL.txt','docs/bad?name','docs/new.'])assert.equal(validInitializationDirectory(value),false,value);
 assert.deepEqual(splitInitializationDirectory('docs/worktree'),{parent:'docs',name:'worktree'});
 assert.deepEqual(splitInitializationDirectory('worktree'),{parent:'',name:'worktree'});
});
