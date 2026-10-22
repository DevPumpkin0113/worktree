import {test} from 'node:test';
import assert from 'node:assert/strict';
import {worktreeReleaseName,worktreeReleaseStage} from '../../src/domain/release-name.ts';
test('제품 완성도는 빌드 방식과 별개로 주 버전으로 구분한다',()=>{
 assert.equal(worktreeReleaseName('0.33.0'),'Beta Worktree 0.33.0');
 assert.equal(worktreeReleaseStage('0.99.99'),'Beta');
 assert.equal(worktreeReleaseName('1.0.0'),'Release Worktree 1.0.0');
 assert.equal(worktreeReleaseName('1.12.3'),'Release Worktree 1.12.3');
});
