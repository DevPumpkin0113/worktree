import test from 'node:test';
import assert from 'node:assert/strict';
import { projectFixture } from '../helpers/project-fixture.ts';
import { projectTaskDraft, updateProjectTask } from '../../src/domain/task-editing.ts';
import { validateTaskDraft } from '../../src/domain/task-draft-validation.ts';

test('편집 검증은 제목·일정·공수·개별 참조 오류를 필드로 구분한다', () => {
  const text = projectFixture();
  const draft = {
    ...projectTaskDraft(text, 'W001'), name: ' ', start: '2026-11-10', end: '2026-11-01', effort: '0',
    references: [{type: 'text', value: ''}, {type: 'file', value: '../outside.md'}],
  };
  assert.deepEqual(Object.keys(validateTaskDraft(text, draft, 'W001')).sort(),
    ['effort', 'end', 'name', 'reference-0', 'reference-1', 'start']);
});

test('순환은 선행 작업에, 후속 작업의 일정 충돌은 현재 종료일에 연결한다', () => {
  const text = projectFixture();
  assert.ok(validateTaskDraft(text, {...projectTaskDraft(text, 'W001'), deps: 'W002'}, 'W001').deps);
  const scheduled = updateProjectTask(text, {...projectTaskDraft(text, 'W002'), start: '2026-11-01', end: '2026-11-02'}, 'W002').text;
  const errors = validateTaskDraft(scheduled, {...projectTaskDraft(scheduled, 'W001'), start: '2026-11-01', end: '2026-11-03'}, 'W001');
  assert.ok(errors.end);
  assert.equal(errors.start, undefined);
});
