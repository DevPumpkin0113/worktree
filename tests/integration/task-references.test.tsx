import '../helpers/dom-setup';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskReferenceList } from '../../apps/desktop/src/components/task-detail/TaskReferenceList';
import { TaskReferenceFields } from '../../apps/desktop/src/components/task-detail/TaskReferenceFields';
import type { TaskReference } from '@worktree/core/project-source';

test('참조는 이름·기본 이름을 표시하고 종류별 열기와 원래 경로 복사를 실행한다', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const calls: { command: string; args: unknown }[] = [];
  const copies: string[] = [];
  const target = window as unknown as { __TAURI_INTERNALS__?: unknown };
  target.__TAURI_INTERNALS__ = {
    invoke: async (command: string, args: unknown) => {
      calls.push({ command, args });
    },
  };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        copies.push(text);
      },
    },
  });
  const references: TaskReference[] = [
    { type: 'web', value: 'https://example.com/spec', name: '설계서' },
    { type: 'file', value: 'docs/한글 파일.md' },
    { type: 'folder', value: 'docs/assets' },
    { type: 'text', value: '기존 메모' },
  ];
  try {
    await act(() =>
      root.render(<TaskReferenceList references={references} project="C:/project/worktree.json" />),
    );
    const items = host.querySelectorAll('li');
    assert.equal(items.length, 4);
    assert.match(items[0].textContent!, /설계서/);
    assert.match(items[1].textContent!, /한글 파일.md/);
    assert.equal(items[3].querySelectorAll('button').length, 1);
    await act(async () => {
      items[0].querySelector('button')!.click();
    });
    assert.equal(calls[0].command, 'open_markdown_link');
    await act(async () => {
      items[1].querySelector('button')!.click();
    });
    assert.deepEqual(calls[1], {
      command: 'open_task_reference',
      args: { project: 'C:/project/worktree.json', value: 'docs/한글 파일.md', kind: 'file' },
    });
    await act(async () => {
      items[2].querySelectorAll('button')[1].click();
    });
    assert.deepEqual(copies, ['docs/assets']);
    target.__TAURI_INTERNALS__ = {
      invoke: async () => {
        throw Error('missing');
      },
    };
    await act(async () => {
      items[2].querySelector('button')!.click();
    });
    assert.match(items[2].textContent!, /열지 못했습니다/);
  } finally {
    await act(() => root.unmount());
    host.remove();
    delete target.__TAURI_INTERNALS__;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  }
});
test('참조 편집 이름 입력은 종류와 경로를 유지하고 비우면 선택 이름을 제거한다', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let current: TaskReference[] = [{ type: 'file', value: 'docs/spec.md', name: '설계서' }];
  const render = () =>
    root.render(
      <TaskReferenceFields
        value={current}
        disabled={false}
        onChange={(value) => {
          current = value;
          render();
        }}
      />,
    );
  try {
    await act(render);
    await act(() => (host.querySelector('.reference-edit-summary') as HTMLButtonElement).click());
    const name = host.querySelector('input[aria-label="참조 이름 1"]') as HTMLInputElement;
    await act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, '');
      name.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(current[0].name, '설계서');
    await act(() => (host.querySelector('#taskReference-confirm') as HTMLButtonElement).click());
    assert.deepEqual(current, [{ type: 'file', value: 'docs/spec.md' }]);
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});

test('새 참조 추가·취소와 기존 참조 적용·취소를 분리하고 미확정 입력은 전체 저장을 막는다', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let current: TaskReference[] = [{ type: 'web', value: 'https://example.com/old', name: '기존' }];
  let saves = 0;
  const render = () =>
    root.render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saves++;
        }}
      >
        <TaskReferenceFields
          value={current}
          disabled={false}
          onChange={(value) => {
            current = value;
            render();
          }}
        />
      </form>,
    );
  const click = async (selector: string) =>
    act(() => {
      (host.querySelector(selector) as HTMLButtonElement).click();
    });
  const value = async (text: string) =>
    act(() => {
      const input = host.querySelector('.reference-composer input') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  const cancel = async () =>
    act(() => {
      (host.querySelector('.reference-composer-actions button') as HTMLButtonElement).click();
    });
  try {
    await act(render);
    await click('#taskReference-add');
    assert.equal(host.querySelector('.reference-composer .reference-remove'), null);
    await value('https://example.com/new');
    assert.equal(current.length, 1);
    await act(() => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(saves, 0);
    assert.ok(host.querySelector('[role="alert"]'));
    await cancel();
    assert.equal(current.length, 1);
    assert.equal(document.activeElement, host.querySelector('#taskReference-add'));
    await click('#taskReference-add');
    await value('https://example.com/new');
    await click('#taskReference-confirm');
    assert.equal(current.length, 2);
    assert.equal(current[1].value, 'https://example.com/new');
    await click('.reference-edit-summary');
    await value('https://example.com/changed');
    await cancel();
    assert.equal(current[0].value, 'https://example.com/old');
    await click('.reference-edit-summary');
    await value('https://example.com/changed');
    await click('#taskReference-confirm');
    assert.equal(current[0].value, 'https://example.com/changed');
    await act(() => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(saves, 1);
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});
