import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectFixture, timestamp } from '../helpers/project-fixture';
import { saveProjectComment, deleteProjectComment } from '@worktree/core/comment-editing';
import { readCommentFile, writeCommentFile } from '@worktree/core/comment-file';
import { validDisplayName } from '@worktree/core/display-name';
import { parseProject } from '@worktree/core/project-document';
import { readSource, serializeSource, ProjectValidationError } from '@worktree/core/project-source';
import { deleteProjectTask } from '@worktree/core/task-deletion';
import { describeDocumentErrors } from '../../apps/desktop/src/domain/document-errors';

const original = projectFixture();
function add(text = original, task = 'W001', author = '박대호', body = '검토 의견\n두 번째 줄') {
  return saveProjectComment(text, task, author, body, undefined, timestamp);
}
test('댓글은 작업별 폴더의 독립 파일로 저장하고 작업 파일과 번호를 보존한다', () => {
  const saved = add(),
    source = readSource(saved),
    comment = parseProject(saved).comments![0];
  const file = `comments/W001/${comment.id}.md`;
  assert.ok(source.files[file]);
  assert.equal(comment.text, '검토 의견\n두 번째 줄');
  for (const [file, text] of Object.entries(readSource(original).files))
    assert.equal(source.files[file], text);
  assert.deepEqual(parseProject(saved).rows, parseProject(original).rows);
  assert.equal(comment.createdAt, timestamp);
});
test('댓글 수정은 원래 작성자·생성 시각·확장 속성과 미래 시각을 보존한다', () => {
  let saved = add();
  const first = parseProject(saved).comments![0],
    source = readSource(saved);
  const file = `comments/W001/${first.id}.md`;
  source.files[file] = source.files[file].replace(
    'schemaVersion: 1',
    'schemaVersion: 1\nexternalField: "keep"',
  );
  saved = serializeSource(source);
  saved = saveProjectComment(
    saved,
    'W001',
    '변경된 표시 이름',
    '수정 의견',
    first.id,
    '2026-10-23T00:00:00.000Z',
  );
  const updated = parseProject(saved).comments![0];
  assert.equal(updated.author, first.author);
  assert.equal(updated.createdAt, first.createdAt);
  assert.equal(updated.text, '수정 의견');
  assert.ok(readSource(saved).files[file].includes('externalField: "keep"'));
  saved = saveProjectComment(saved, 'W001', '다른 이름', '다시 수정', first.id, timestamp);
  assert.equal(parseProject(saved).comments![0].updatedAt, updated.updatedAt);
});
test('댓글 삭제와 작업·마일스톤 삭제는 연결된 댓글만 제거한다', () => {
  let saved = add();
  saved = add(saved, 'W002', '다른 작성자', '다른 작업');
  saved = add(saved, 'MS001', '박대호', '마일스톤');
  const model = parseProject(saved),
    first = model.comments!.find((c) => c.taskId === 'W001')!;
  const removed = deleteProjectComment(saved, 'W001', first.id);
  assert.equal(parseProject(removed).comments!.filter((c) => !c.deleted).length, 2);
  assert.deepEqual(parseProject(removed).rows, model.rows);
  const keep = deleteProjectTask(
    saved,
    'MS001',
    { children: 'keep', detachPredecessors: false },
    timestamp,
  );
  assert.deepEqual(
    parseProject(keep)
      .comments!.map((c) => c.taskId)
      .sort(),
    ['W001', 'W002'],
  );
  const all = deleteProjectTask(
    saved,
    'MS001',
    { children: 'delete', detachPredecessors: false },
    timestamp,
  );
  assert.equal(parseProject(all).comments!.length, 0);
});
test('댓글의 잘못된 값과 고아 참조는 해당 파일·필드로 보고한다', () => {
  const saved = add(),
    source = readSource(saved),
    [file] = Object.keys(source.files).filter((file) => file.startsWith('comments/'));
  const body = source.files[file];
  for (const [field, replacement] of [
    ['author', '""'],
    ['taskId', '"W999"'],
    ['createdAt', '"2026-02-30T00:00:00.000Z"'],
    ['updatedAt', '"2020-01-01T00:00:00.000Z"'],
  ] as const) {
    const changed = {
      ...source,
      files: {
        ...source.files,
        [file]: body.replace(new RegExp('^' + field + ':.*$', 'm'), field + ': ' + replacement),
      },
    };
    assert.throws(
      () => parseProject(serializeSource(changed)),
      (error: unknown) => {
        assert.ok(error instanceof ProjectValidationError);
        assert.equal(error.file, file);
        assert.equal(error.field, field);
        const problem = describeDocumentErrors(
          error,
          serializeSource(changed),
          'C:/QA/worktree.json',
        )[0];
        assert.ok(problem.source.endsWith(file));
        assert.ok(problem.lineNumbers.length);
        return true;
      },
    );
  }
  delete source.files['tasks/W001.md'];
  source.files['tasks/W002.md'] = source.files['tasks/W002.md'].replace(
    'dependencies: ["W001"]',
    'dependencies: []',
  );
  assert.throws(() => parseProject(serializeSource(source)), ProjectValidationError);
});
test('빈 이름·내용·긴 본문·잘못된 경로·없는 작업과 삭제된 댓글 편집은 저장하지 않는다', () => {
  for (const [author, text] of [
    ['', '내용'],
    ['작성자', '   '],
    ['이름\n둘', '내용'],
    ['x'.repeat(41), '내용'],
    ['작성자', 'x'.repeat(2001)],
  ])
    assert.throws(() => add(original, 'W001', author, text));
  assert.throws(() => add(original, 'W999'));
  assert.throws(() => readCommentFile('../outside.md', 'content'));
  const saved = add(),
    commentFile = Object.keys(readSource(saved).files).find((file) =>
      file.startsWith('comments/'),
    )!;
  const invalid = readSource(saved);
  (invalid.files as Record<string, unknown>)[commentFile] = 42;
  assert.throws(
    () => parseProject(serializeSource(invalid)),
    (error: unknown) => {
      assert.ok(error instanceof ProjectValidationError);
      assert.equal(error.file, commentFile);
      assert.equal(error.field, 'content');
      return true;
    },
  );
  assert.throws(() =>
    saveProjectComment(original, 'W001', '이름', '내용', '00000000-0000-0000-0000-000000000001'),
  );
  assert.equal(validDisplayName('', true), true);
  assert.equal(validDisplayName(''), false);
  assert.equal(validDisplayName(' 이름'), false);
  assert.equal(validDisplayName('새 이름'), true);
  const comment = parseProject(add()).comments![0];
  assert.throws(() => writeCommentFile({ ...comment, id: '../escape' }));
});

test('답글은 원댓글의 한 단계로 묶고 직접 답한 대상을 보존하며 삭제 번호를 재사용하지 않는다', () => {
  let saved = add();
  const root = parseProject(saved).comments![0];
  saved = saveProjectComment(saved, 'W001', '작성자', '답글', undefined, timestamp, root.id);
  const reply = parseProject(saved).comments!.find((c) => c.number === 2)!;
  saved = saveProjectComment(
    saved,
    'W001',
    '작성자',
    '답글의 답글',
    undefined,
    timestamp,
    reply.id,
  );
  const third = parseProject(saved).comments!.find((c) => c.number === 3)!;
  assert.equal(third.rootId, root.id);
  assert.equal(third.replyTo, reply.id);
  saved = deleteProjectComment(saved, 'W001', root.id);
  let comments = parseProject(saved).comments!;
  assert.equal(comments.find((c) => c.id === root.id)!.text, '');
  assert.equal(comments.find((c) => c.id === root.id)!.deleted, true);
  assert.equal(comments.filter((c) => !c.deleted).length, 2);
  assert.throws(() =>
    saveProjectComment(saved, 'W001', '작성자', '삭제 대상 답글', undefined, timestamp, root.id),
  );
  assert.throws(() => saveProjectComment(saved, 'W001', '작성자', '복원 금지', root.id));
  saved = add(saved);
  comments = parseProject(saved).comments!;
  assert.deepEqual(comments.map((c) => c.number).sort(), [1, 2, 3, 4]);
  const source = readSource(saved),
    file = `comments/W001/${third.id}.md`;
  source.files[file] = source.files[file].replace('number: 3', 'number: 2');
  assert.throws(() => parseProject(serializeSource(source)), ProjectValidationError);
});

test('기존 번호 없는 댓글은 읽기에서 변경하지 않고 다음 명시적 저장에서 번호를 고정한다', () => {
  const source = readSource(add());
  const file = Object.keys(source.files).find((file) => file.startsWith('comments/'))!;
  source.files[file] = source.files[file].replace(/^number:.*\n/m, '');
  const legacy = serializeSource(source);
  assert.equal(parseProject(legacy).comments![0].number, 1);
  assert.ok(!readSource(legacy).files[file].includes('number:'));
  const saved = add(legacy);
  assert.ok(readSource(saved).files[file].includes('number: 1'));
  assert.deepEqual(
    parseProject(saved)
      .comments!.map((c) => c.number)
      .sort(),
    [1, 2],
  );
});

test('답글의 누락·다른 작업·자기 참조와 원댓글이 아닌 rootId를 거부한다', () => {
  let saved = add();
  const root = parseProject(saved).comments![0];
  saved = saveProjectComment(saved, 'W001', '작성자', '답글', undefined, timestamp, root.id);
  const reply = parseProject(saved).comments!.find((c) => c.number === 2)!;
  const source = readSource(saved),
    file = `comments/W001/${reply.id}.md`;
  for (const fields of [
    { rootId: reply.id },
    { replyTo: reply.id },
    { replyTo: '00000000-0000-0000-0000-000000000001' },
    { rootId: undefined },
    { replyTo: undefined },
  ]) {
    const value = { ...reply, ...fields };
    if (!value.rootId) delete value.rootId;
    if (!value.replyTo) delete value.replyTo;
    const changed = {
      ...source,
      files: { ...source.files, [file]: writeCommentFile(value) },
    };
    assert.throws(() => parseProject(serializeSource(changed)), ProjectValidationError);
  }
  const other = add(saved, 'W002');
  const target = parseProject(other).comments!.find((c) => c.taskId === 'W002')!;
  assert.throws(() =>
    saveProjectComment(other, 'W001', '작성자', '다른 작업 대상', undefined, timestamp, target.id),
  );
});

test('답글이 달린 댓글과 답글은 수정할 수 없고 답글 삭제 후에도 대화 이력을 보존한다', () => {
  let saved = add();
  const root = parseProject(saved).comments![0];
  saved = saveProjectComment(saved, 'W001', '작성자', '답글', undefined, timestamp, root.id);
  const reply = parseProject(saved).comments!.find((c) => c.number === 2)!;
  assert.throws(() => saveProjectComment(saved, 'W001', '작성자', '변경', root.id), /답글/);
  saved = saveProjectComment(saved, 'W001', '작성자', '답글 수정 가능', reply.id);
  saved = saveProjectComment(
    saved,
    'W001',
    '작성자',
    '두 번째 답글',
    undefined,
    timestamp,
    reply.id,
  );
  assert.throws(() => saveProjectComment(saved, 'W001', '작성자', '변경', reply.id), /답글/);
  saved = deleteProjectComment(saved, 'W001', reply.id);
  assert.throws(() => saveProjectComment(saved, 'W001', '작성자', '변경', root.id), /답글/);
});
