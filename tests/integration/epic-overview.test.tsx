import '../helpers/dom-setup';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EpicOverview } from '../../apps/desktop/src/components/workspace/EpicOverview';
import { parseProject } from '@worktree/core/project-document';
import { projectFixture } from '../helpers/project-fixture';
import type { WorkModel, WorkRow } from '@worktree/core/types';

test('에픽은 기존 상세를 열고 삭제·외부 갱신·빈 목록을 반영한다', async () => {
  const base = parseProject(projectFixture()),
    group = base.rows.find((row) => row.milestone)!;
  const epic = (id: string, name: string): WorkRow => ({
    ...group,
    id,
    name,
    epic: true,
    milestone: false,
    parent: '-',
    description: '# ' + name,
  });
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const opened: string[] = [];
  const render = (model: WorkModel) =>
    root.render(
      <EpicOverview
        model={model}
        label={(id) => id}
        onOpen={(id) => opened.push(id)}
        onAdd={() => {}}
      />,
    );
  try {
    await act(() =>
      render({ ...base, rows: [epic('EP001', '첫 목표'), epic('EP002', '두 번째 목표')] }),
    );
    await act(() =>
      (
        host.querySelector('[data-epic-overview-row="EP002"] td:last-child') as HTMLTableCellElement
      ).click(),
    );
    assert.deepEqual(opened, ['EP002']);
    assert.equal(host.querySelector('.epic-overview-detail'), null);
    await act(() => render({ ...base, rows: [epic('EP001', '수정된 목표')] }));
    assert.match(
      host.querySelector('[data-epic-overview-row="EP001"]')!.textContent!,
      /수정된 목표/,
    );
    await act(() =>
      (host.querySelector('[data-epic-overview-row="EP001"] button') as HTMLButtonElement).click(),
    );
    assert.deepEqual(opened, ['EP002', 'EP001']);
    await act(() => render({ ...base, rows: [] }));
    assert.ok(host.querySelector('.epic-overview-empty'));
    assert.equal(host.querySelector('.epic-overview-detail'), null);
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});
