import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validTaskReference, referenceDisplayName } from '../../packages/core/src/task-references.ts';
import { projectFixture } from '../helpers/project-fixture.ts';
import { projectTaskDraft, updateProjectTask } from '../../packages/core/src/task-editing.ts';
import { parseProject } from '../../packages/core/src/project-document.ts';

const refs = [
  { type: 'text', value: '기존 일반 텍스트\n설명' },
  { type: 'file', value: 'docs/spec.md' },
  { type: 'web', value: 'https://example.com/docs?q=한글', name: '설계 문서' },
  { type: 'folder', value: 'docs/자료 폴더', name: '자료' },
];
test('참조 이름과 새 종류는 원문 저장·재조회·부분 수정에서 보존된다', () => {
  const source = projectFixture();
  const draft = projectTaskDraft(source, 'W001');
  draft.references = refs;
  const saved = updateProjectTask(source, draft, 'W001').text;
  assert.deepEqual(parseProject(saved).rows.find(r => r.id === 'W001').references, refs);
  const edited = projectTaskDraft(saved, 'W001');
  edited.name = '제목만 변경';
  const next = updateProjectTask(saved, edited, 'W001').text;
  assert.deepEqual(parseProject(next).rows.find(r => r.id === 'W001').references, refs);
  assert.equal('name' in parseProject(next).rows.find(r => r.id === 'W001').references[1], false);
});
test('이름 미입력은 파일명·폴더명·도메인으로 표시하되 원본을 수정하지 않는다', () => {
  const cases = [
    [{ type:'file', value:'docs/한글 파일.md' }, '한글 파일.md'],
    [{ type:'file', value:'docs\\spec.md' }, 'spec.md'],
    [{ type:'folder', value:'docs/images' }, 'images'],
    [{ type:'web', value:'https://example.com/path', name:' ' }, 'example.com'],
    [{ type:'text', value:'https://example.com/old' }, 'example.com'],
    [{ type:'text', value:'기존 텍스트' }, '기존 텍스트'],
    [{ type:'file', value:'docs/spec.md', name:' 설계서 ' }, '설계서'],
  ];
  for (const [reference, expected] of cases) {
    const before = JSON.stringify(reference);
    assert.equal(referenceDisplayName(reference), expected);
    assert.equal(JSON.stringify(reference), before);
  }
});
test('잘못된 참조는 공통 검증과 실제 문서 저장에서 거부한다', () => {
  for (const reference of [
    null, [], {}, {type:'web',value:'javascript:alert(1)'},
    {type:'web',value:'file:///C:/a'}, {type:'web',value:'/relative'},
    {type:'folder',value:'../secret'}, {type:'file',value:'C:/a.md'},
    {type:'file',value:'docs/a.md',name:123}, {type:'text',value:'x',name:'잘못\n이름'},
  ]) {
    assert.equal(validTaskReference(reference), false);
    const draft = projectTaskDraft(projectFixture(), 'W001');
    draft.references = [reference];
    assert.throws(() => updateProjectTask(projectFixture(), draft, 'W001'));
  }
  assert.ok(refs.every(validTaskReference));
});
