import '../helpers/dom-setup';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { App } from '../../src/App';
import { WorkspaceStore } from '../../src/app/workspace-store';
import { emptySession } from '../../src/platform/session-storage';
import { pathKey, parentFolder } from '../../src/domain/project-paths';
import { projectFixture } from '../helpers/project-fixture';
import { parseProject } from '../../src/domain/project-document';
import { readSource, serializeSource } from '../../src/domain/project-source';
import { deleteProjectTask } from '../../src/domain/task-deletion';
import type { Platform } from '../../src/app/types';
const first = 'C:/QA/worktree.json',
  second = 'C:/QB/worktree.json';
async function fixture(
  options: {
    sessionFailure?: boolean;
    language?: 'ko' | 'en';
    displayName?: string;
    autoCheckUpdates?: boolean;
    updateKind?: string;
    updateVersion?: string;
  } = {},
) {
  const files = new Map([
    [first, projectFixture('첫 프로젝트')],
    [second, projectFixture('둘째 프로젝트')],
  ]);
  let saveFailure = false,
    settingsFailure = false;
  const calls: { command: string; args?: Record<string, unknown> }[] = [];
  const platform: Platform = {
    setTitle() {},
    async control() {},
    channel: (handler) => handler,
    async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
      calls.push({ command, args });
      let result: unknown;
      if (command === 'load_settings')
        result = {
          settings: {
            schemaVersion: 2,
            language: options.language ?? 'ko',
            displayName: options.displayName ?? '',
            idSeparator: 'none',
            detailMode: 'sidebar',
            autoCheckUpdates: options.autoCheckUpdates ?? false,
          },
          warning: '',
        };
      else if (command === 'save_settings') {
        if (settingsFailure) throw Error('settings write failure');
        result = args?.settings;
      } else if (command === 'load_session') {
        if (options.sessionFailure) throw Error('session failure');
        result = {
          ...emptySession(),
          projects: [
            { path: 'C:/QA', activePath: first },
            { path: 'C:/QB', activePath: second },
          ],
          activeProjectPath: 'C:/QA',
          tabs: [
            { path: first, view: 'tree', ganttUnit: 'day' },
            { path: second, view: 'board', ganttUnit: 'week' },
          ],
          activePath: first,
          recentProjects: ['C:/QA', 'C:/QB'],
        };
      } else if (command === 'scan_project') {
        const path = String(args?.path).replaceAll('\\', '/');
        if (path === 'C:/missing') throw Error('missing folder');
        const root = path.endsWith('/worktree.json') ? parentFolder(path) : path;
        const marker = [...files.keys()].find(
          (file) => pathKey(file) === pathKey(root + '/worktree.json'),
        );
        result = { path: root, files: marker ? [marker] : [], selectedPath: marker ?? null };
      } else if (command === 'read_project') {
        const text = files.get(String(args?.path));
        if (!text) throw Error('missing project');
        result = text;
      } else if (command === 'save_project') {
        if (saveFailure) throw Error('disk failure');
        const path = String(args?.path);
        if (files.get(path) !== args?.expected) result = 'conflict';
        else {
          files.set(path, String(args?.text));
          result = 'saved';
        }
      } else if (command === 'initialize_project') {
        if (saveFailure) throw Error('disk failure');
        const key = String(args?.path) + '/worktree.json';
        if (files.has(key)) throw Error('exists');
        const source = readSource(projectFixture(String(args?.name), String(args?.taskPrefix)));
        const config = JSON.parse(source.files['project.json']);
        config.nextTaskNumber = 1;
        config.nextMilestoneNumber = 1;
        config.useEffort = args?.useEffort;
        config.idSeparator = args?.idSeparator;
        Object.assign(config, args?.rules);
        source.dataDirectory = String(args?.dataDirectory);
        source.files = { 'project.json': JSON.stringify(config) };
        files.set(key, serializeSource(source));
      } else if (command === 'pick_project') result = 'C:/QA';
      else if (command === 'take_open_requests') result = [];
      else if (command === 'get_build_info')
        result = {
          version: '0.24.0',
          builtAt: '1792500000',
          channel: 'development',
          commit: 'abc123',
          platform: 'windows',
        };
      else if (command === 'check_app_update')
        result = {
          kind: options.updateKind ?? 'latest',
          version: options.updateVersion ?? '0.24.0',
          notes: '',
        };
      return result as T;
    },
  };
  const store = new WorkspaceStore(platform);
  await store.initialize();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<App store={store} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const element = <T extends Element = HTMLElement>(selector: string) => {
    const node = host.querySelector<T>(selector);
    assert.ok(node, selector);
    return node;
  };
  const click = async (selector: string) =>
    act(async () => {
      element<HTMLElement>(selector).click();
    });
  const value = async (selector: string, value: string) =>
    act(async () => {
      const node = element<HTMLInputElement | HTMLTextAreaElement>(selector);
      const prototype =
        node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(node, value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
    });
  const addBadge = async (selector: string, text: string) => {
    await value(selector, text);
    await click(selector + '-add');
  };
  const clearBadges = async (selector: string) => {
    while (host.querySelector(selector + '-badges .value-badge > button:not(:disabled)'))
      await click(selector + '-badges .value-badge > button:not(:disabled)');
  };
  const submit = async () =>
    act(async () => {
      element('#taskEditor form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
  return {
    store,
    host,
    files,
    calls,
    platform,
    element,
    click,
    value,
    submit,
    addBadge,
    clearBadges,
    setSaveFailure: (value: boolean) => {
      saveFailure = value;
    },
    setSettingsFailure: (value: boolean) => {
      settingsFailure = value;
    },
    async close() {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}

test('프로젝트 하나에 문서 집합 하나를 표시하며 파일 트리 없이 페이지·프로젝트를 전환한다', async () => {
  const f = await fixture();
  try {
    assert.equal(f.store.getSnapshot().projects.length, 2);
    assert.equal(f.host.querySelector('#projectFiles'), null);
    assert.equal(f.host.querySelector('#projectTreeResize'), null);
    assert.ok(f.host.textContent?.includes('첫 프로젝트'));
    await f.click('[data-workspace-page="tasks"]');
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.getSnapshot().page, 'board');
    assert.equal(f.store.active?.model?.title, '둘째 프로젝트');
    await f.click('[data-workspace-page="analytics"]');
    await act(() => f.store.selectProject('C:/QA'));
    assert.equal(f.store.getSnapshot().page, 'tasks');
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.getSnapshot().page, 'analytics');
    await f.click('#projectManageOpen');
    assert.ok(f.host.textContent?.includes('docs\\worktree'));
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    assert.equal(f.host.querySelector('#projectManagement dialog'), null);
    await f.click('#workspaceCollapse');
    assert.ok(document.documentElement.classList.contains('workspace-nav-collapsed'));
  } finally {
    await f.close();
  }
});
test('초기화하지 않은 폴더는 생성 화면을 제공하고 지정 위치·프리픽스를 전달한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    assert.ok(f.host.querySelector('.initialization-steps'));
    assert.equal(f.element('#workspace').getAttribute('data-page'), 'initialize');
    await f.value('#initialization-name', '신규 프로젝트');
    await f.value('#initialization-directory-name', 'custom');
    await f.click('#initializationNext');
    await f.click('#initialization-format-date-separator');
    await f.click('#initialization-format-date-separator-option-1');
    await f.click('#initialization-format-time');
    await f.click('#initialization-format-time-option-1');
    await f.value('#initialization-prefix', 'DEV');
    await f.click('#initialization-idSeparator');
    await f.click('#initialization-idSeparator-option-1');
    await f.clearBadges('#initialization-taskTypes');
    await f.addBadge('#initialization-taskTypes', '개발, 검토');
    await f.click('#initialization-taskTypes-badges [data-value="개발"] .badge-color-control');
    await f.value(
      '#initialization-taskTypes-badges [data-value="개발"] input[type="color"]',
      '#123456',
    );
    await f.addBadge('#initialization-labels', 'ui, api');
    await f.click('#initializationNext');
    await act(async () => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(f.store.active?.model?.idPrefix, 'DEV');
    assert.equal(f.store.active?.model?.dateFormat, 'yyyy.MM.dd');
    assert.equal(f.store.active?.model?.timeFormat, '12h');
    assert.deepEqual(f.store.active?.model?.taskTypes, ['개발', '검토']);
    assert.equal(f.store.active?.model?.taskTypeColors?.['개발'], '#123456');
    assert.deepEqual(f.store.active?.model?.labels, ['ui', 'api']);
    assert.equal(f.store.active?.model?.idSeparator, 'hyphen');
    assert.equal(f.store.active?.model?.dataDirectory, 'docs/custom');
    assert.equal(f.store.active?.model?.rows.length, 0);
    assert.ok(f.host.querySelector('#taskAddOpen'));
    assert.equal(f.host.querySelector('#initializationSubmit'), null);
    await f.click('#taskAddOpen');
    assert.equal(f.host.querySelector('#taskEditor input[readonly]'), null);
    await f.value('#taskEditor-name', '첫 작업');
    await f.submit();
    assert.ok(f.store.active?.model?.rows.some((row) => row.id === 'DEV001'));
  } finally {
    await f.close();
  }
});
test('초기화 실패 시 입력을 유지하고 재시도한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    await f.value('#initialization-name', '유지할 이름');
    await f.click('#initializationNext');
    await f.click('#initializationNext');
    f.setSaveFailure(true);
    await act(async () => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.match(f.element('[role="alert"]').textContent ?? '', /disk failure/);
    for (let i = 0; i < 2; i++) await f.click('#initializationPrevious');
    assert.equal(f.element<HTMLInputElement>('#initialization-name').value, '유지할 이름');
    await f.click('#initializationNext');
    assert.equal(f.store.active, null);
    f.setSaveFailure(false);
    await f.click('#initializationNext');
    await act(async () => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(
      f.store.getSnapshot().documents.find((doc) => doc.path === 'C:/NEW/worktree.json')?.model
        ?.title,
      '유지할 이름',
    );
  } finally {
    await f.close();
  }
});
test('작업은 제목만 필수이고 설명·메타데이터·참조를 개별 파일에 저장한다', async () => {
  const f = await fixture();
  try {
    await f.click('#taskAddOpen');
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').required, true);
    assert.equal(f.element<HTMLTextAreaElement>('#taskEditor-description').required, false);
    await f.value('#taskEditor-name', '신규 작업');
    await f.value('#taskEditor-description', '두 줄 설명\n<script>안전한 문자열</script>');
    for (const label of ['ui', 'new']) {
      await f.value('#taskEditor-labels', label);
      await act(() =>
        f
          .element('#taskEditor-labels')
          .dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
          ),
      );
    }
    await f.value('#taskEditor-blockedReason', '외부 확인 대기');
    await f.click('#taskEditor-priority');
    await f.click('#taskEditor-priority-options [role="option"][data-value="high"]');
    await f.click('#taskReference-add');
    await f.value('.task-reference-row input', 'docs/spec.md');
    await f.submit();
    assert.equal(f.host.querySelector('#taskEditor'), null);
    const row = f.store.active!.model!.rows.find((row) => row.id === 'W003')!;
    assert.match(row.description, /두 줄 설명/);
    assert.equal(row.blockedReason, '외부 확인 대기');
    assert.deepEqual(row.labels, ['ui', 'new']);
    assert.ok(row.createdAt);
    assert.ok(readSource(f.files.get(first)!).files['tasks/W003.md']);
    assert.ok(f.host.textContent?.includes('두 줄 설명'));
    assert.equal(f.host.querySelector('#taskDetail script'), null);
  } finally {
    await f.close();
  }
});
test('작업 저장 실패·외부 변경은 입력을 보존하며 취소 시 저장하지 않는다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '변경 초안');
    f.setSaveFailure(true);
    await f.submit();
    assert.match(f.element('#taskEditorError').textContent ?? '', /disk failure/);
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '변경 초안');
    assert.equal(parseProject(f.files.get(first)!).rows[1].name, '댓글 구현');
    f.setSaveFailure(false);
    const external = readSource(f.files.get(first)!);
    external.files['tasks/W002.md'] = external.files['tasks/W002.md'].replace(
      'UI 확인',
      '외부 수정',
    );
    f.files.set(first, serializeSource(external));
    await f.submit();
    assert.match(f.element('#taskEditorError').textContent ?? '', /외부/);
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '변경 초안');
    await f.click('#taskEditorCancel');
    assert.match(f.files.get(first)!, /외부 수정/);
  } finally {
    await f.close();
  }
});
test('제목 변경은 ID·파일명을 유지하고 상세에 설명과 시각을 표시한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '이름만 변경');
    await f.submit();
    assert.equal(f.store.active?.model?.rows.find((r) => r.id === 'W001')?.name, '이름만 변경');
    assert.ok(readSource(f.files.get(first)!).files['tasks/W001.md']);
    assert.ok(f.host.textContent?.includes('생성 시각'));
    assert.ok(f.host.textContent?.includes('수정 시각'));
  } finally {
    await f.close();
  }
});
test('막힘 사유는 막힘 상태에서만 입력 가능하고 상태를 바꿔도 내용을 보존한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    assert.ok(f.element<HTMLTextAreaElement>('#taskEditor-blockedReason').disabled);
    await f.click('#taskEditor-status');
    await f.click('#taskEditor-status-options [data-value="blocked"]');
    assert.equal(f.element<HTMLTextAreaElement>('#taskEditor-blockedReason').disabled, false);
    await f.value('#taskEditor-blockedReason', '외부 응답 대기');
    await f.click('#taskEditor-status');
    await f.click('#taskEditor-status-options [data-value="doing"]');
    assert.ok(f.element<HTMLTextAreaElement>('#taskEditor-blockedReason').disabled);
    assert.equal(
      f.element<HTMLTextAreaElement>('#taskEditor-blockedReason').value,
      '외부 응답 대기',
    );
    await f.submit();
    assert.equal(
      parseProject(f.files.get(first)!).rows.find((row) => row.id === 'W001')?.blockedReason,
      '외부 응답 대기',
    );
    assert.match(f.element('.detail-section-disabled').textContent ?? '', /외부 응답 대기/);
  } finally {
    await f.close();
  }
});
test('저장 시 제목·일정·참조 오류를 해당 입력 아래 표시하고 첫 오류로 이동한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    assert.ok(f.element<HTMLFormElement>('#taskEditorForm').noValidate);
    await f.value('#taskEditor-name', '   ');
    await f.click('#taskReference-add');
    await f.submit();
    assert.ok(f.element('#detailTitle').contains(f.element('#taskEditor-name-error')));
    assert.ok(
      f.element('.task-reference-value-field').contains(f.element('#taskEditor-reference-0-error')),
    );
    assert.equal(document.activeElement, f.element('#taskEditor-name'));
    assert.equal(f.element('#taskEditor-reference-0').getAttribute('aria-invalid'), 'true');
    assert.equal(f.calls.filter((call) => call.command === 'save_project').length, 0);
    await f.value('#taskEditor-name', '검증 확인');
    await f.click('#taskReference-type-0');
    await f.click('#taskReference-type-0-options [data-value="file"]');
    await f.value('#taskEditor-reference-0', '../outside.txt');
    await f.submit();
    assert.match(f.element('#taskEditor-reference-0-error').textContent ?? '', /상대/);
    assert.equal(document.activeElement, f.element('#taskEditor-reference-0'));
    await f.value('#taskEditor-reference-0', 'docs/design.md');
    await f.value('#taskEditor-start', '2026-11-10');
    await f.value('#taskEditor-end', '2026-11-01');
    await f.submit();
    assert.ok(
      f.element('#taskEditor-start').parentElement!.contains(f.element('#taskEditor-start-error')),
    );
    assert.ok(
      f.element('#taskEditor-end').parentElement!.contains(f.element('#taskEditor-end-error')),
    );
    assert.equal(document.activeElement, f.element('#taskEditor-start'));
    await f.value('#taskEditor-end', '2026-11-11');
    await f.submit();
    assert.equal(f.host.querySelector('#taskEditor'), null);
    assert.equal(
      parseProject(f.files.get(first)!).rows.find((row) => row.id === 'W001')?.name,
      '검증 확인',
    );
  } finally {
    await f.close();
  }
});
test('상세 수정 초안은 작업·프로젝트 전환과 추가 탭을 오가도 분리해 유지한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '첫 작업 초안');
    await act(() => f.store.selectWork('W002'));
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '둘째 작업 초안');
    await act(() => f.store.selectWork('W001'));
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '첫 작업 초안');
    await f.click('#taskAddOpen');
    assert.equal(f.host.querySelectorAll('#taskEditor').length, 1);
    assert.equal(f.element('#taskEditor').tagName, 'SECTION');
    await f.click('#taskEditorCancel');
    await act(() => f.store.selectWork('W001'));
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '첫 작업 초안');
    await act(() => f.store.selectProject('C:/QB'));
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '다른 프로젝트 초안');
    await act(() => f.store.selectProject('C:/QA'));
    await act(() => f.store.selectWork('W002'));
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '둘째 작업 초안');
    await f.click('#taskEditorCancel');
    assert.equal(f.host.querySelector('#taskEditor'), null);
    await act(() => f.store.selectWork('W001'));
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '첫 작업 초안');
    await f.submit();
    assert.equal(f.host.querySelector('#taskEditor'), null);
    assert.equal(f.element('#detailTitle').textContent, '첫 작업 초안');
  } finally {
    await f.close();
  }
});
test('마일스톤 상세에서 제목·기간을 수정하고 취소와 저장 후 조회로 돌아온다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('MS001'));
    await f.click('#taskEditOpen');
    assert.equal(f.element('#taskEditor').tagName, 'SECTION');
    assert.equal(f.host.querySelector('#taskEditor-description'), null);
    await f.value('#taskEditor-name', '취소할 제목');
    await f.click('#taskEditorCancel');
    assert.equal(f.element('#detailTitle').textContent, '화면 작업');
    await f.click('#taskEditOpen');
    await f.value('#taskEditor-name', '출시 준비');
    await f.value('#taskEditor-start', '2026-11-01');
    await f.value('#taskEditor-end', '2026-11-07');
    await f.submit();
    const milestone = parseProject(f.files.get(first)!).rows.find((row) => row.id === 'MS001')!;
    assert.equal(milestone.name, '출시 준비');
    assert.equal(milestone.start, '2026-11-01');
    assert.equal(milestone.end, '2026-11-07');
    assert.equal(f.host.querySelector('#taskEditor'), null);
    assert.equal(f.element('#detailTitle').textContent, '출시 준비');
  } finally {
    await f.close();
  }
});
test('마일스톤 생성은 제목·선택 기간을 사용하며 별도 파일로 저장한다', async () => {
  const f = await fixture();
  try {
    await f.click('#milestoneAddOpen');
    assert.equal(f.host.querySelector('#taskEditor-description'), null);
    await f.value('#taskEditor-name', '다음 출시');
    await f.submit();
    assert.ok(readSource(f.files.get(first)!).files['milestones/MS002.md']);
    assert.equal(f.store.active?.model?.rows.find((r) => r.id === 'MS002')?.name, '다음 출시');
  } finally {
    await f.close();
  }
});
test('작업·마일스톤 작성 탭은 초안을 분리하고 저장 시 같은 위치를 실제 ID로 바꾼다', async () => {
  const f = await fixture();
  try {
    assert.equal(f.store.getSnapshot().settings.detailMode, 'sidebar');
    await f.click('#taskAddOpen');
    const firstDraft = f.store.getSnapshot().selectedId!;
    assert.equal(f.store.detailMode, 'tabs');
    assert.equal(f.store.getSnapshot().settings.detailMode, 'sidebar');
    assert.equal(f.element('#taskEditor').tagName, 'SECTION');
    assert.ok(f.element('#taskCreationDetail').contains(f.element('#taskEditor')));
    await f.value('#taskEditor-name', '첫 작성 초안');
    await f.click('#taskAddOpen');
    const secondDraft = f.store.getSnapshot().selectedId!;
    assert.notEqual(firstDraft, secondDraft);
    assert.equal(f.element('[id="task-tab-' + secondDraft + '"]').textContent, '새 작업 (2)');
    await f.value('#taskEditor-name', '두 번째 저장');
    await f.submit();
    assert.equal(f.store.getSnapshot().selectedId, 'W003');
    assert.deepEqual(f.store.active!.taskTabs, [firstDraft, 'W003']);
    await act(() => f.store.selectWork(firstDraft));
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '첫 작성 초안');
    await f.submit();
    assert.equal(f.store.getSnapshot().selectedId, 'W004');
    assert.deepEqual(f.store.active!.taskTabs, ['W004', 'W003']);
    await f.click('#milestoneAddOpen');
    const milestoneDraft = f.store.getSnapshot().selectedId!;
    assert.equal(f.element('[id="task-tab-' + milestoneDraft + '"]').textContent, '새 마일스톤');
    assert.equal(f.host.querySelector('#taskEditor-description'), null);
    await f.value('#taskEditor-name', '새 목표');
    await f.submit();
    assert.equal(f.store.getSnapshot().selectedId, 'MS002');
    assert.deepEqual(f.store.active!.taskTabs, ['W004', 'W003', 'MS002']);
    assert.equal(f.element('#detailTitle').textContent, '새 목표');
    assert.equal(f.store.active?.creationTabs?.length, 0);
  } finally {
    await f.close();
  }
});
test('작성 탭은 프로젝트·홈 전환과 외부 갱신에 초안을 유지하고 세션에는 넣지 않는다', async () => {
  const f = await fixture();
  try {
    await f.click('#taskAddOpen');
    const draftId = f.store.getSnapshot().selectedId!;
    await f.value('#taskEditor-name', '세션에 남기지 않는 초안');
    await f.click('#task-home-tab');
    await act(() => f.store.selectWork(draftId));
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '세션에 남기지 않는 초안');
    await act(() => f.store.selectProject('C:/QB'));
    await f.click('#milestoneAddOpen');
    await f.value('#taskEditor-name', '다른 프로젝트 목표');
    await act(() => f.store.selectProject('C:/QA'));
    assert.equal(f.store.getSnapshot().selectedId, draftId);
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '세션에 남기지 않는 초안');
    f.setSaveFailure(true);
    await f.submit();
    assert.match(f.element('#taskEditorError').textContent ?? '', /disk failure/);
    f.setSaveFailure(false);
    const source = readSource(f.files.get(first)!);
    source.files['tasks/W002.md'] = source.files['tasks/W002.md'].replace('UI 확인', '외부 제목');
    f.files.set(first, serializeSource(source));
    await f.submit();
    assert.match(f.element('#taskEditorError').textContent ?? '', /외부/);
    await act(() => f.store.poll());
    assert.equal(f.store.getSnapshot().selectedId, draftId);
    assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '세션에 남기지 않는 초안');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const savedSession = f.calls.filter((call) => call.command === 'save_session').at(-1)!.args!
      .session;
    assert.ok(!JSON.stringify(savedSession).includes('new:'));
    assert.ok(!JSON.stringify(savedSession).includes('세션에 남기지 않는 초안'));
    await f.submit();
    assert.equal(f.element('#detailTitle').textContent, '세션에 남기지 않는 초안');
    assert.match(f.files.get(first)!, /외부 제목/);
    await f.click('#taskAddOpen');
    const abandoned = f.store.getSnapshot().selectedId!;
    await act(() => f.store.closeTaskTab(abandoned));
    assert.ok(!f.store.active?.taskTabs?.includes(abandoned));
    assert.ok(!f.store.active?.creationTabs?.some((tab) => tab.id === abandoned));
  } finally {
    await f.close();
  }
});
test('수정의 마일스톤 선택은 표시 ID와 제목을 보여주고 원본 ID로 저장한다', async () => {
  const f = await fixture();
  try {
    const source = readSource(f.files.get(first)!);
    const config = JSON.parse(source.files['project.json']);
    config.idSeparator = 'hyphen';
    source.files['project.json'] = JSON.stringify(config);
    f.files.set(first, serializeSource(source));
    await act(() => f.store.poll());
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    assert.match(f.element('#taskEditor-parent').textContent ?? '', /MS-001 · 화면 작업/);
    await f.click('#taskEditor-parent');
    assert.match(
      f.element('#taskEditor-parent-options [data-value="MS001"]').textContent ?? '',
      /MS-001 · 화면 작업/,
    );
    await f.click('#taskEditor-parent-options [data-value="MS001"]');
    await f.submit();
    assert.equal(
      parseProject(f.files.get(first)!).rows.find((row) => row.id === 'W001')?.parent,
      'MS001',
    );
  } finally {
    await f.close();
  }
});
test('작업 삭제는 선행 참조 해제 선택과 실패 보존을 지원한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskDeleteOpen');
    const checks = f.host.querySelectorAll<HTMLInputElement>(
      '#taskDeleteDialog input[type="checkbox"]',
    );
    assert.equal(checks.length, 1);
    const affected = f.element('.delete-dependency-card');
    assert.match(affected.querySelector('.delete-dependency-heading')!.textContent ?? '', /W002/);
    assert.equal(affected.querySelector('.delete-kept-badge')!.textContent, '유지됨');
    assert.match(affected.querySelector('.delete-removed-link')!.textContent ?? '', /W001/);
    assert.ok(f.element<HTMLButtonElement>('#taskDeleteConfirm').disabled);
    assert.equal(f.element('#taskDeleteConfirm').textContent, '작업 삭제');
    await act(() => {
      f.element('#taskDeleteDialog form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.ok(readSource(f.files.get(first)!).files['tasks/W001.md']);
    await act(() => checks[0].click());
    assert.equal(f.element<HTMLButtonElement>('#taskDeleteConfirm').disabled, false);
    await f.click('#taskDeleteConfirm');
    assert.ok(!readSource(f.files.get(first)!).files['tasks/W001.md']);
    assert.deepEqual(f.store.active?.model?.rows.find((r) => r.id === 'W002')?.deps, []);
  } finally {
    await f.close();
  }
});
test('외부 갱신은 상세·보기를 유지하고 삭제된 선택만 닫는다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await act(() => f.store.setView('gantt'));
    const source = readSource(f.files.get(first)!);
    source.files['tasks/W001.md'] = source.files['tasks/W001.md'].replace('댓글 구현', '외부 제목');
    f.files.set(first, serializeSource(source));
    await act(() => f.store.poll());
    assert.equal(f.store.getSnapshot().selectedId, 'W001');
    assert.equal(f.store.active?.view, 'gantt');
    assert.equal(f.store.active?.model?.rows.find((r) => r.id === 'W001')?.name, '외부 제목');
    f.files.set(
      first,
      deleteProjectTask(f.files.get(first)!, 'W001', {
        children: 'keep',
        detachPredecessors: true,
      }),
    );
    await act(() => f.store.poll());
    assert.equal(f.store.getSnapshot().selectedId, null);
  } finally {
    await f.close();
  }
});
test('작업 파일 오류는 실제 파일 경로와 필드를 표시하고 정상 파일로 복구한다', async () => {
  const f = await fixture();
  try {
    const original = f.files.get(first)!;
    const bad = readSource(original);
    bad.files['tasks/W001.md'] = bad.files['tasks/W001.md'].replace(
      'status: "doing"',
      'status: "invalid"',
    );
    f.files.set(first, serializeSource(bad));
    await act(() => f.store.poll());
    assert.equal(f.store.active?.model, null);
    await f.click('#error');
    assert.ok(f.host.textContent?.includes('tasks/W001.md'));
    assert.ok(f.host.textContent?.includes('status'));
    f.files.set(first, original);
    await act(() => f.store.poll());
    assert.ok(f.store.active?.model);
    assert.equal(f.store.problems.length, 0);
  } finally {
    await f.close();
  }
});
test('손상된 세션은 저장하지 않고 프로젝트를 직접 열어 복구한다', async () => {
  const f = await fixture({ sessionFailure: true });
  try {
    assert.equal(f.store.active, null);
    await act(() => f.store.open('C:/QA'));
    assert.ok(f.store.getSnapshot().documents[0]?.model);
    assert.ok(!f.calls.some((c) => c.command === 'save_session'));
  } finally {
    await f.close();
  }
});
test('설정 저장·언어 전환과 실패 시 기존 값 유지를 지원한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('language', 'en'));
    assert.ok(f.host.textContent?.includes('Task list'));
    f.setSettingsFailure(true);
    await act(() => f.store.saveSetting('language', 'ko'));
    assert.equal(f.store.getSnapshot().settings.language, 'en');
    f.setSettingsFailure(false);
    await act(() => f.store.saveSetting('language', 'ko'));
    assert.ok(f.host.textContent?.includes('작업 목록'));
  } finally {
    await f.close();
  }
});
test('프로젝트 재정렬·닫기와 세션 저장은 프로젝트당 하나의 보기를 보존한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.reorder('C:/QB', 'C:/QA', false));
    await act(() => f.store.setView('gantt'));
    await act(() => f.store.setGanttUnit('week'));
    const saved = f.calls.filter((c) => c.command === 'save_session').at(-1)?.args?.session as {
      tabs: { path: string; view: string }[];
    };
    assert.equal(saved.tabs.length, 2);
    assert.ok(saved.tabs.some((tab) => tab.path === first && tab.view === 'gantt'));
    await act(() => f.store.closeProject('C:/QB'));
    assert.equal(f.store.getSnapshot().projects.length, 1);
    assert.equal(f.store.getSnapshot().documents.length, 1);
  } finally {
    await f.close();
  }
});
test('검색은 라벨과 설명을 포함하고 필터 드롭다운을 사용한다', async () => {
  const f = await fixture();
  try {
    await f.value('#search', '입력 확인');
    assert.ok(f.host.textContent?.includes('댓글 구현'));
    assert.ok(!f.element('#content').textContent?.includes('UI 확인'));
    await f.value('#search', '');
    await f.click('#status');
    assert.ok(f.host.querySelector('#status-options'));
    await f.click('#status-options [role="option"][data-value="done"]');
    assert.ok(f.element('#content').textContent?.includes('UI 확인'));
    assert.ok(!f.element('#content').textContent?.includes('댓글 구현'));
  } finally {
    await f.close();
  }
});

test('설정 파일이 있지만 읽기에 실패한 프로젝트에는 초기화를 제안하지 않는다', async () => {
  const f = await fixture();
  try {
    f.files.set(first, '');
    await act(() => f.store.refreshProject());
    assert.equal(f.store.active, null);
    assert.equal(f.host.querySelector('#projectInit-submit'), null);
    assert.ok(f.store.problems.length);
  } finally {
    await f.close();
  }
});
test('댓글을 표시 이름으로 저장하고 프로젝트·작업별 초안과 영구 파일을 분리한다', async () => {
  const f = await fixture({ displayName: '박대호' });
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#previewCommentsTab');
    assert.ok(f.element('.comment-list').textContent?.includes('아직 댓글이 없습니다'));
    await f.value('#commentContent', '<script>실행하지 않음</script>');
    await f.click('.comment-form button[type="submit"]');
    const firstComment = parseProject(f.files.get(first)!).comments![0];
    assert.equal(firstComment.author, '박대호');
    assert.equal(firstComment.text, '<script>실행하지 않음</script>');
    assert.equal(f.host.querySelector('#detail script'), null);
    await f.value('#commentContent', '첫 프로젝트 초안');
    await act(() => f.store.selectProject('C:/QB'));
    await act(() => f.store.selectWork('W001'));
    await f.click('#previewCommentsTab');
    assert.equal(f.element<HTMLTextAreaElement>('#commentContent').value, '');
    await f.value('#commentContent', '둘째 프로젝트 초안');
    await act(() => f.store.selectProject('C:/QA'));
    await act(() => f.store.selectWork('W001'));
    assert.equal(f.element<HTMLTextAreaElement>('#commentContent').value, '첫 프로젝트 초안');
    await act(() => f.store.closeProject('C:/QA'));
    await act(() => f.store.open('C:/QA'));
    await act(() => f.store.selectWork('W001'));
    await f.click('#previewCommentsTab');
    assert.equal(f.element<HTMLTextAreaElement>('#commentContent').value, '');
    assert.ok(f.element('.comment-list').textContent?.includes('<script>실행하지 않음</script>'));
  } finally {
    await f.close();
  }
});

test('표시 이름 설정과 저장 실패는 입력을 유지하며 새 댓글만 새 작성자를 사용한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#previewCommentsTab');
    assert.equal(f.element<HTMLTextAreaElement>('#commentContent').disabled, true);
    await f.click('.comment-author button');
    await f.value('#displayName', '박대호');
    f.setSettingsFailure(true);
    await f.click('.display-name-controls button');
    assert.equal(f.element<HTMLInputElement>('#displayName').value, '박대호');
    assert.equal(f.store.getSnapshot().settings.displayName, '');
    f.setSettingsFailure(false);
    await f.click('.display-name-controls button');
    await f.click('#settingsClose');
    await f.value('#commentContent', '저장할 의견');
    f.setSaveFailure(true);
    await f.click('.comment-form button[type="submit"]');
    assert.equal(f.element<HTMLTextAreaElement>('#commentContent').value, '저장할 의견');
    assert.match(f.element('.comment-feedback[role="alert"]').textContent ?? '', /disk failure/);
    f.setSaveFailure(false);
    await f.click('.comment-form button[type="submit"]');
    await act(() => f.store.saveSetting('displayName', '새 이름'));
    await f.value('#commentContent', '두 번째');
    await f.click('.comment-form button[type="submit"]');
    assert.deepEqual(
      parseProject(f.files.get(first)!)
        .comments!.map((c) => c.author)
        .sort(),
      ['박대호', '새 이름'].sort(),
    );
  } finally {
    await f.close();
  }
});

test('댓글 수정·삭제는 충돌과 실패에서 입력·확인을 유지하고 외부 변경을 덮지 않는다', async () => {
  const f = await fixture({ displayName: '박대호' });
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#previewCommentsTab');
    await f.value('#commentContent', '원본 의견');
    await f.click('.comment-form button[type="submit"]');
    const originalComment = parseProject(f.files.get(first)!).comments![0];
    await f.click('.comment-edit');
    await f.value('#commentEditContent', '보존할 수정');
    const external = readSource(f.files.get(first)!);
    const file = `comments/W001/${originalComment.id}.md`;
    external.files[file] = external.files[file].replace('원본 의견', '외부 수정');
    f.files.set(first, serializeSource(external));
    await act(() => f.store.poll());
    await f.click('.comment-list .comment-form button[type="submit"]');
    assert.equal(f.element<HTMLTextAreaElement>('#commentEditContent').value, '보존할 수정');
    assert.match(f.element('.comment-feedback[role="alert"]').textContent ?? '', /외부/);
    assert.equal(parseProject(f.files.get(first)!).comments![0].text, '외부 수정');
    await f.click('.comment-list .comment-form button[type="button"]');
    await f.click('.comment-edit');
    await f.value('#commentEditContent', '확정 수정');
    await act(() => f.store.saveSetting('displayName', '새 이름'));
    await f.click('.comment-list .comment-form button[type="submit"]');
    const updated = parseProject(f.files.get(first)!).comments![0];
    assert.equal(updated.author, '박대호');
    assert.equal(updated.createdAt, originalComment.createdAt);
    assert.equal(updated.text, '확정 수정');
    await f.click('.comment-actions button:last-child');
    f.setSaveFailure(true);
    await f.click('.comment-delete-confirm');
    assert.ok(f.host.querySelector('.comment-delete-confirm'));
    assert.equal(parseProject(f.files.get(first)!).comments!.length, 1);
    f.setSaveFailure(false);
    await f.click('.comment-delete-confirm');
    assert.equal(parseProject(f.files.get(first)!).comments!.filter((c) => !c.deleted).length, 0);
  } finally {
    await f.close();
  }
});

test('프로젝트 문서 집합에서도 간트 7일·5주와 단위별 스크롤 복원을 유지한다', async () => {
  const f = await fixture();
  try {
    const data = readSource(f.files.get(first)!);
    data.files['tasks/W001.md'] = data.files['tasks/W001.md']
      .replace('start: "-"', 'start: "2026-10-01"')
      .replace('end: "-"', 'end: "2026-10-10"');
    data.files['tasks/W002.md'] = data.files['tasks/W002.md']
      .replace('start: "-"', 'start: "2026-10-11"')
      .replace('end: "-"', 'end: "2026-12-20"');
    f.files.set(first, serializeSource(data));
    await act(() => f.store.poll());
    await act(() => f.store.setView('gantt'));
    assert.equal(f.element<HTMLElement>('.gantt-scroll').dataset.visibleDays, '7');
    await act(() => {
      const scroll = f.element<HTMLElement>('.gantt-scroll');
      scroll.scrollLeft += 75;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    const saved = Number(f.element<HTMLElement>('.gantt-scroll').dataset.windowStart);
    await act(() => f.store.setGanttUnit('week'));
    assert.equal(f.element<HTMLElement>('.gantt-scroll').dataset.visibleDays, '35');
    await act(() => f.store.setGanttUnit('day'));
    assert.ok(
      Math.abs(Number(f.element<HTMLElement>('.gantt-scroll').dataset.windowStart) - saved) < 1,
    );
    await act(() => f.store.setView('tree'));
    await act(() => f.store.setView('gantt'));
    assert.ok(
      Math.abs(Number(f.element<HTMLElement>('.gantt-scroll').dataset.windowStart) - saved) < 1,
    );
  } finally {
    await f.close();
  }
});

test('프로젝트 관리는 조회·수정의 항목 순서를 유지하고 고정 값만 비활성화한다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    assert.ok(f.host.textContent?.includes('기본 정보'));
    const overviewFields = [...f.host.querySelectorAll('#projectManagement dt')].map(
      (node) => node.textContent,
    );
    await f.click('#projectResetOpen');
    assert.ok(f.host.querySelector('#projectResetDialog'));
    assert.ok(f.element<HTMLButtonElement>('#projectResetConfirm').disabled);
    await f.click('#projectResetCancel');
    assert.ok(
      !f.calls.some(
        (call) => call.command === 'initialize_project' || call.command === 'save_project',
      ),
    );
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    await f.click('#projectEditOpen');
    assert.deepEqual(
      [...f.host.querySelectorAll('#projectManagement dt')].map((node) => node.textContent),
      overviewFields,
    );
    assert.equal(f.host.querySelector('.project-fixed-settings'), null);
    assert.equal(f.element<HTMLButtonElement>('#projectSettings-save').disabled, true);
    for (let i = 0; i < 4; i++) {
      assert.ok(f.element<HTMLInputElement>('#projectFixed-' + i).disabled);
      assert.ok(f.element('#projectFixed-' + i).matches(':disabled'));
    }
    await f.value('#projectSettings-name', '프로젝트 변경');
    await f.addBadge('#projectSettings-taskTypes', '운영');
    await f.addBadge('#projectSettings-labels', 'backend');
    await f.click('#projectSettings-useEffort');
    await act(async () => {
      const form = f.element('#projectSettingsForm');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(f.calls.filter((call) => call.command === 'save_project').length, 1);
    assert.equal(f.store.active?.model?.title, '프로젝트 변경');
    assert.equal(f.store.active?.model?.useEffort, true);
    assert.ok(f.store.active?.model?.taskTypes?.includes('운영'));
    assert.ok(f.host.textContent?.includes('프로젝트 설정을 저장했습니다.'));
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    await f.click('[data-workspace-page="tasks"]');
    await f.click('#taskAddOpen');
    await f.click('#taskEditor-taskType');
    assert.ok(f.host.textContent?.includes('운영'));
  } finally {
    await f.close();
  }
});
test('프로젝트 설정의 저장 실패와 사용 중인 유형 제거는 입력과 원본을 보존한다', async () => {
  const f = await fixture();
  try {
    const original = f.files.get(first);
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.value('#projectSettings-name', '저장할 이름');
    f.setSaveFailure(true);
    await f.click('#projectSettings-save');
    assert.match(f.element('#projectSettings-error').textContent ?? '', /disk failure/);
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '저장할 이름');
    assert.equal(f.files.get(first), original);
    f.setSaveFailure(false);
    assert.equal(
      f.element<HTMLButtonElement>(
        '#projectSettings-taskTypes-badges [data-value="feature"] .value-badge > button',
      ).disabled,
      true,
    );
    await f.click('#projectSettings-taskTypes-badges [data-value="feature"] .value-badge > button');
    assert.ok(f.host.querySelector('#projectSettings-taskTypes-badges [data-value="feature"]'));
    assert.equal(f.files.get(first), original);
    await f.click('#projectSettings-reset');
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    await f.click('#projectEditOpen');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '첫 프로젝트');
    assert.equal(f.host.querySelector('#projectSettings-error'), null);
  } finally {
    await f.close();
  }
});
test('설정 편집 중 외부 변경은 초안을 유지하고 충돌 후 변경 취소로 최신 설정을 불러온다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.value('#projectSettings-name', '내 초안');
    const data = readSource(f.files.get(first)!);
    const config = JSON.parse(data.files['project.json']);
    config.name = '외부 이름';
    data.files['project.json'] = JSON.stringify(config);
    f.files.set(first, serializeSource(data));
    await act(() => f.store.poll());
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '내 초안');
    await f.click('#projectSettings-save');
    assert.match(f.element('#projectSettings-error').textContent ?? '', /외부/);
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '내 초안');
    await f.click('#projectSettings-reset');
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    await f.click('#projectEditOpen');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '외부 이름');
    assert.equal(f.element<HTMLButtonElement>('#projectSettings-save').disabled, true);
  } finally {
    await f.close();
  }
});
test('읽기 오류 중에도 프로젝트 설정 초안을 유지하고 프로젝트 전환 시 서로 섞지 않는다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.value('#projectSettings-name', '보존할 초안');
    const data = readSource(f.files.get(first)!);
    data.files['tasks/W001.md'] = data.files['tasks/W001.md'].replace(
      'status: "doing"',
      'status: "invalid"',
    );
    f.files.set(first, serializeSource(data));
    await act(() => f.store.poll());
    assert.equal(f.store.active?.model, null);
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '보존할 초안');
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.host.querySelector('#projectSettingsForm'), null);
    assert.equal(f.store.getSnapshot().page, 'board');
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-name').value, '둘째 프로젝트');
  } finally {
    await f.close();
  }
});

test('타이틀바 좌측은 패널 접힘에 따라 아이콘만 숨기고 새로고침·창 제어를 유지한다', async () => {
  const f = await fixture();
  try {
    assert.ok(f.host.querySelector('.titlebar-workspace .app-mark'));
    assert.ok(f.host.querySelector('.titlebar-workspace #reload'));
    assert.equal(f.host.querySelector('.titlebar-workspace #settingsOpen'), null);
    await f.click('#workspaceCollapse');
    assert.equal(f.host.querySelector('.titlebar .app-mark'), null);
    assert.ok(f.host.querySelector('.titlebar-workspace #reload'));
    const before = f.calls.filter((call) => call.command === 'scan_project').length;
    await f.click('#reload');
    assert.equal(f.calls.filter((call) => call.command === 'scan_project').length, before + 1);
    const controls: string[] = [];
    f.platform.control = async (action) => {
      controls.push(action);
    };
    await f.click('#windowMinimize');
    await f.click('#windowMaximize');
    await f.click('#windowClose');
    await act(() => {
      f.element('.titlebar-workspace').dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0, detail: 1 }),
      );
    });
    assert.deepEqual(controls, ['minimize', 'maximize', 'close', 'drag']);
    await f.click('#settingsOpen');
    assert.equal(f.store.getSnapshot().settingsOpen, true);
    await f.click('#settingsOpen');
    await f.click('#workspaceCollapse');
    assert.ok(f.host.querySelector('.titlebar-workspace .app-mark'));
  } finally {
    await f.close();
  }
});

test('프로젝트별 페이지는 갱신·탭 닫기에도 해당 프로젝트의 마지막 위치를 따른다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.setPage('project'));
    await act(() => f.store.refreshProject());
    assert.equal(f.store.getSnapshot().page, 'project');
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.getSnapshot().page, 'board');
    await act(() => f.store.setPage('analytics'));
    await act(() => f.store.selectProject('C:/QA'));
    assert.equal(f.store.getSnapshot().page, 'project');
    await act(() => f.store.closeProject('C:/QA'));
    assert.equal(f.store.getSnapshot().page, 'analytics');
    await act(() => f.store.closeProject('C:/QB'));
    assert.equal(f.store.getSnapshot().page, 'board');
    await act(() => f.store.open('C:/QA'));
    assert.equal(f.store.getSnapshot().page, 'board');
  } finally {
    await f.close();
  }
});

test('하이픈 표시는 프로젝트에 저장하며 전환·재열기 시 분리하고 앱 설정에는 표시하지 않는다', async () => {
  const f = await fixture();
  try {
    const before = readSource(f.files.get(first)!);
    await f.click('#settingsOpen');
    assert.equal(f.host.querySelector('#idSeparator'), null);
    await f.click('#settingsOpen');
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.click('#projectSettings-idSeparator');
    await f.click('#projectSettings-idSeparator-option-1');
    await f.click('#projectSettings-save');
    assert.equal(f.store.active?.model?.idSeparator, 'hyphen');
    assert.equal(
      JSON.parse(readSource(f.files.get(first)!).files['project.json']).idSeparator,
      'hyphen',
    );
    for (const [file, content] of Object.entries(before.files))
      if (file !== 'project.json')
        assert.equal(readSource(f.files.get(first)!).files[file], content);
    await f.click('[data-workspace-page="tasks"]');
    assert.ok(f.element('.all-tasks').textContent?.includes('W-001'));
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.active?.model?.idSeparator, 'none');
    await act(() => f.store.closeProject('C:/QA'));
    await act(() => f.store.open('C:/QA'));
    assert.equal(f.store.active?.model?.idSeparator, 'hyphen');
    assert.ok(!f.calls.some((call) => call.command === 'save_settings'));
  } finally {
    await f.close();
  }
});

test('프로젝트 날짜·시간 형식 저장 후 상세 시각에 적용하고 다른 프로젝트와 분리한다', async () => {
  const f = await fixture();
  try {
    const original = readSource(f.files.get(first)!);
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.click('#projectSettings-format-date-separator');
    await f.click('#projectSettings-format-date-separator-option-1');
    await f.click('#projectSettings-format-time');
    await f.click('#projectSettings-format-time-option-1');
    await f.click('#projectSettings-save');
    assert.equal(f.store.active?.model?.dateFormat, 'yyyy.MM.dd');
    assert.equal(f.store.active?.model?.timeFormat, '12h');
    await act(() => f.store.selectWork('W001'));
    const shown = f.element('#detail time[datetime="2026-10-21T00:00:00.000Z"]').textContent ?? '';
    assert.match(shown, /\d{4}\.\d{2}\.\d{2}/);
    assert.match(shown, /오전|오후|AM|PM/);
    for (const [file, text] of Object.entries(original.files))
      if (file !== 'project.json') assert.equal(readSource(f.files.get(first)!).files[file], text);
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.active?.model?.dateFormat, 'yyyy-MM-dd');
    assert.equal(f.store.active?.model?.timeFormat, '24h');
  } finally {
    await f.close();
  }
});

test('초기화 작업 규칙은 빈 유형·중복 라벨을 막고 단계 이동 후 입력을 유지한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    await f.click('#initializationNext');
    await f.clearBadges('#initialization-taskTypes');
    await f.click('#initializationNext');
    assert.ok(f.host.querySelector('#initialization-taskTypes'));
    await f.clearBadges('#initialization-taskTypes');
    await f.addBadge('#initialization-taskTypes', '개발, 검토');
    await f.addBadge('#initialization-labels', 'ui, ui');
    await f.click('#initializationNext');
    assert.ok(f.host.querySelector('#initialization-labels'));
    await f.addBadge('#initialization-labels', 'ui');
    await f.click('#initializationNext');
    assert.ok(f.host.querySelector('#initializationSubmit'));
    await f.click('#initializationPrevious');
    assert.deepEqual(
      [...f.host.querySelectorAll('#initialization-taskTypes-badges li')].map(
        (node) => (node as HTMLElement).dataset.value,
      ),
      ['개발', '검토'],
    );
    await act(() => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.ok(!f.calls.some((call) => call.command === 'initialize_project'));
  } finally {
    await f.close();
  }
});

test('날짜 순서와 구분기호는 독립 변경하고 시간 형식과 다른 선택을 유지한다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.click('#projectSettings-format-date-order');
    await f.click('#projectSettings-format-date-order-option-1');
    await f.click('#projectSettings-format-date-separator');
    await f.click('#projectSettings-format-date-separator-option-1');
    assert.ok(f.element('.date-time-format-input small').textContent?.includes('21.10.2026'));
    await f.click('#projectSettings-format-time');
    await f.click('#projectSettings-format-time-option-1');
    await f.click('#projectSettings-format-date-order');
    await f.click('#projectSettings-format-date-order-option-2');
    assert.equal(
      f.element('#projectSettings-format-date-separator').textContent?.includes('.'),
      true,
    );
    await f.click('#projectSettings-save');
    assert.equal(f.store.active?.model?.dateFormat, 'MM.dd.yyyy');
    assert.equal(f.store.active?.model?.timeFormat, '12h');
    await f.click('#projectEditOpen');
    assert.ok(f.element('#projectSettings-format-date-order').textContent?.includes('MM dd yyyy'));
    assert.ok(f.element('#projectSettings-format-date-separator').textContent?.includes('.'));
  } finally {
    await f.close();
  }
});

test('초기화 접두어는 즉시 오류 표시와 최종 제출 검사를 제공한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    await f.click('#initializationNext');
    for (const value of ['MS', 'W1', '개발', 'A'.repeat(21), '']) {
      await f.value('#initialization-prefix', value);
      assert.equal(f.element('#initialization-prefix').getAttribute('aria-invalid'), 'true');
      await f.click('#initializationNext');
      assert.ok(f.host.querySelector('#initialization-prefix'));
    }
    await act(() => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.ok(!f.calls.some((call) => call.command === 'initialize_project'));
    assert.ok(f.host.querySelector('#initialization-prefix'));
    await f.value('#initialization-prefix', 'dev');
    assert.equal(f.element<HTMLInputElement>('#initialization-prefix').value, 'DEV');
    assert.equal(f.element('#initialization-prefix').getAttribute('aria-invalid'), 'false');
    assert.ok(!f.element('.id-separator-input small').textContent?.includes('작업 연결'));
  } finally {
    await f.close();
  }
});

test('상위 폴더 찾기는 선택·취소·실패 시 새 폴더 이름과 초안을 보존한다', async () => {
  const f = await fixture();
  try {
    let result: string | null = 'docs/custom';
    let failure = false;
    const invoke = f.platform.invoke.bind(f.platform);
    f.platform.invoke = async <T,>(command: string, args?: Record<string, unknown>): Promise<T> => {
      if (command === 'pick_project_parent') {
        if (failure) throw Error('outside project');
        return result as T;
      }
      return invoke<T>(command, args);
    };
    await act(() => f.store.open('C:/NEW'));
    await f.value('#initialization-directory-name', 'plan');
    await f.click('#initialization-browse');
    assert.equal(f.element<HTMLInputElement>('#initialization-parent').value, 'docs/custom');
    assert.ok(
      f.element('.initialization-path-preview').textContent?.includes('C:/NEW/docs/custom/plan'),
    );
    result = null;
    await f.click('#initialization-browse');
    assert.equal(f.element<HTMLInputElement>('#initialization-directory-name').value, 'plan');
    failure = true;
    await f.click('#initialization-browse');
    assert.ok(f.element('[role="alert"]').textContent?.includes('outside project'));
    assert.equal(f.element<HTMLInputElement>('#initialization-parent').value, 'docs/custom');
    await f.value('#initialization-parent', '../outside');
    await f.click('#initializationNext');
    assert.ok(f.host.querySelector('#initialization-parent'));
    await f.value('#initialization-parent', '');
    assert.ok(f.element('.initialization-path-preview').textContent?.includes('C:/NEW/plan'));
  } finally {
    await f.close();
  }
});

test('초기화는 기본 검증 말풍선 없이 오류를 안내하고 상하단과 가운데 스크롤을 분리한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    const form = f.element<HTMLFormElement>('.initialization-preview');
    assert.equal(form.noValidate, true);
    let nativeReports = 0;
    form.reportValidity = () => {
      nativeReports++;
      return false;
    };
    assert.ok(form.querySelector(':scope > .initialization-heading'));
    assert.ok(form.querySelector(':scope > .initialization-actions'));
    assert.equal(form.querySelector('.initialization-scroll .initialization-heading'), null);
    assert.equal(form.querySelector('.initialization-scroll .initialization-actions'), null);
    await f.value('#initialization-name', '');
    await f.click('#initializationNext');
    assert.ok(f.element('#initialization-name-error').textContent);
    assert.equal(document.activeElement, f.element('#initialization-name'));
    await f.value('#initialization-name', '신규');
    f.element<HTMLElement>('.initialization-scroll').scrollTop = 80;
    await f.click('#initializationNext');
    assert.equal(f.element<HTMLElement>('.initialization-scroll').scrollTop, 0);
    await f.value('#initialization-prefix', 'MS');
    await f.click('#initializationNext');
    assert.equal(document.activeElement, f.element('#initialization-prefix'));
    await f.value('#initialization-prefix', 'W');
    await f.clearBadges('#initialization-taskTypes');
    await f.click('#initializationNext');
    assert.ok(f.element('#initialization-taskTypes-error').textContent);
    assert.equal(nativeReports, 0);
    assert.equal(f.host.querySelector('.initialization-steps [title]'), null);
  } finally {
    await f.close();
  }
});

test('공용 필터 목록은 상위 표시 레이어에 떠서 위치를 보정하고 키보드·바깥 클릭으로 닫힌다', async () => {
  const f = await fixture();
  const prototype = HTMLElement.prototype;
  const originalShow = Object.getOwnPropertyDescriptor(prototype, 'showPopover');
  const originalHide = Object.getOwnPropertyDescriptor(prototype, 'hidePopover');
  let shown = 0;
  Object.defineProperty(prototype, 'showPopover', {
    configurable: true,
    value() {
      shown++;
    },
  });
  Object.defineProperty(prototype, 'hidePopover', { configurable: true, value() {} });
  try {
    const trigger = f.element<HTMLButtonElement>('#status');
    let top = 600;
    trigger.getBoundingClientRect = () =>
      ({
        left: 100,
        top,
        bottom: top + 40,
        right: 242,
        width: 142,
        height: 40,
        x: 100,
        y: top,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    await f.click('#status');
    const popup = f.element<HTMLElement>('#status-options');
    assert.equal(popup.getAttribute('popover'), 'manual');
    assert.equal(shown, 1);
    assert.equal(popup.style.top, '354px');
    top = 100;
    await act(() => window.dispatchEvent(new Event('resize')));
    assert.equal(popup.style.top, '146px');
    await act(() =>
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
      ),
    );
    await act(() =>
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      ),
    );
    assert.equal(f.store.getSnapshot().status, 'done');
    assert.equal(f.host.querySelector('#status-options'), null);
    assert.equal(document.activeElement, trigger);
    await f.click('#status');
    await act(() => document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })));
    assert.equal(f.host.querySelector('#status-options'), null);
    await f.click('#status');
    await act(() =>
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    );
    assert.equal(f.host.querySelector('#status-options'), null);
  } finally {
    await f.close();
    if (originalShow) Object.defineProperty(prototype, 'showPopover', originalShow);
    else Reflect.deleteProperty(prototype, 'showPopover');
    if (originalHide) Object.defineProperty(prototype, 'hidePopover', originalHide);
    else Reflect.deleteProperty(prototype, 'hidePopover');
  }
});
test('선행 검색 목록은 떠서 표시하고 키보드 탐색이 폼 스크롤을 움직이지 않는다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    const input = f.element<HTMLInputElement>('#taskEditor-deps');
    input.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      bottom: 140,
      right: 400,
      width: 300,
      height: 40,
      x: 100,
      y: 100,
      toJSON() {
        return {};
      },
    });
    await f.click('#taskEditor-deps');
    const popup = f.element<HTMLElement>('#taskEditor-deps-options');
    assert.equal(popup.getAttribute('popover'), 'manual');
    assert.equal(popup.style.top, '146px');
    const body = f.element<HTMLElement>('.task-editor-body');
    body.scrollTop = 37;
    const option = f.element<HTMLElement>('#taskEditor-deps-option-0');
    Object.defineProperties(option, { offsetTop: { value: 300 }, offsetHeight: { value: 20 } });
    Object.defineProperty(popup, 'clientHeight', { value: 60 });
    await f.value('#taskEditor-deps', 'UI');
    assert.equal(body.scrollTop, 37);
    assert.equal(popup.scrollTop, 260);
    await act(() =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    );
    assert.equal(f.host.querySelector('#taskEditor-deps-options'), null);
    assert.ok(f.host.querySelector('#taskEditor'));
  } finally {
    await f.close();
  }
});
test('유형은 색상 뱃지로 선택하고 라벨은 검색·Enter 생성·제거 후 작업에만 저장한다', async () => {
  const f = await fixture();
  try {
    const source = readSource(f.files.get(first)!);
    const config = JSON.parse(source.files['project.json']);
    config.labels = ['frontend', 'backend'];
    config.taskTypeColors.feature = '#123456';
    source.files['project.json'] = JSON.stringify(config);
    f.files.set(first, serializeSource(source));
    await act(() => f.store.poll());
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskEditOpen');
    assert.equal(
      f
        .element<HTMLElement>('#taskEditor-taskType .value-badge')
        .style.getPropertyValue('--badge-color'),
      '#123456',
    );
    await f.click('#taskEditor-taskType');
    assert.ok(f.host.querySelector('#taskEditor-taskType-options [data-value="bug"] .value-badge'));
    await f.click('#taskEditor-taskType-options [data-value="bug"]');
    await f.click('#taskEditor-labels');
    assert.equal(f.element('#taskEditor-labels-options').getAttribute('popover'), 'manual');
    await f.click('#taskEditor-labels-options [data-value="frontend"]');
    await f.value('#taskEditor-labels', 'security');
    const enter = () =>
      f
        .element('#taskEditor-labels')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        );
    await act(enter);
    assert.equal(
      f.host.querySelectorAll('.task-field-labels .search-multi-selected .value-badge').length,
      2,
    );
    await f.value('#taskEditor-labels', 'security');
    await act(enter);
    assert.equal(
      f.host.querySelectorAll('.task-field-labels .search-multi-selected .value-badge').length,
      2,
    );
    await f.click('.task-field-labels .search-multi-selected button');
    await f.submit();
    const saved = parseProject(f.files.get(first)!);
    const row = saved.rows.find((row) => row.id === 'W001')!;
    assert.equal(row.taskType, 'bug');
    assert.deepEqual(row.labels, ['security']);
    assert.deepEqual(saved.commonLabels, ['frontend', 'backend']);
    assert.match(f.element('.detail-label-badges .value-badge').textContent ?? '', /security/);
  } finally {
    await f.close();
  }
});

test('상위 폴더와 새 폴더 오류는 해당 입력 바로 아래에 표시하고 올바른 항목에 포커스한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    await f.value('#initialization-parent', '../outside');
    assert.equal(f.element('#initialization-parent').getAttribute('aria-invalid'), 'true');
    assert.equal(f.element('#initialization-directory-name').getAttribute('aria-invalid'), 'false');
    assert.ok(
      f
        .element('#initialization-parent-error')
        .closest('.task-editor-field')
        ?.contains(f.element('#initialization-parent')),
    );
    assert.equal(f.host.querySelector('#initialization-directory-error'), null);
    await f.click('#initializationNext');
    assert.equal(document.activeElement, f.element('#initialization-parent'));
    await f.value('#initialization-parent', 'docs');
    await f.value('#initialization-directory-name', 'CON');
    assert.equal(f.element('#initialization-parent').getAttribute('aria-invalid'), 'false');
    assert.equal(f.element('#initialization-directory-name').getAttribute('aria-invalid'), 'true');
    assert.ok(
      f
        .element('#initialization-directory-error')
        .closest('.task-editor-field')
        ?.contains(f.element('#initialization-directory-name')),
    );
    await f.click('#initializationNext');
    assert.equal(document.activeElement, f.element('#initialization-directory-name'));
    await f.value('#initialization-directory-name', 'plan');
    assert.equal(f.host.querySelector('#initialization-directory-error'), null);
    await f.click('#initializationNext');
    assert.ok(f.host.querySelector('#initialization-taskTypes'));
  } finally {
    await f.close();
  }
});

test('초기화 좌측 단계는 읽기 전용이며 하단 이전·다음만 단계를 이동한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    assert.equal(f.host.querySelector('.initialization-steps button'), null);
    assert.equal(f.host.querySelector('.initialization-steps [tabindex]'), null);
    assert.equal(f.host.querySelectorAll('.initialization-step').length, 3);
    await f.click('.initialization-step:last-child');
    assert.ok(f.host.querySelector('#initialization-name'));
    assert.equal(
      f.element('.initialization-step[aria-current="step"]').textContent?.includes('기본 정보'),
      true,
    );
    await f.click('#initializationNext');
    assert.ok(f.host.querySelector('#initialization-prefix'));
    assert.equal(
      f.element('.initialization-step[aria-current="step"]').textContent?.includes('작업 규칙'),
      true,
    );
    await f.click('#initializationPrevious');
    assert.ok(f.host.querySelector('#initialization-name'));
  } finally {
    await f.close();
  }
});

test('유형·공통 라벨 뱃지는 추가·중복 차단·삭제하며 유형 색상은 저장 실패와 재열기에도 유지한다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    await f.value('#projectSettings-taskTypes', '검토');
    await act(() =>
      f
        .element('#projectSettings-taskTypes')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        ),
    );
    assert.ok(f.host.querySelector('#projectSettings-taskTypes-badges [data-value="검토"]'));
    await f.addBadge('#projectSettings-labels', 'team');
    await f.addBadge('#projectSettings-labels', 'team');
    assert.ok(f.host.querySelector('#projectSettings-labels-error'));
    assert.equal(
      f.host.querySelectorAll('#projectSettings-labels-badges [data-value="team"]').length,
      1,
    );
    await f.value('#projectSettings-labels', '');
    await f.click('#projectSettings-labels-badges [data-value="team"] button');
    assert.equal(f.host.querySelector('#projectSettings-labels-badges [data-value="team"]'), null);
    await f.click('#projectSettings-taskTypes-badges [data-value="feature"] .badge-color-control');
    await f.value(
      '#projectSettings-taskTypes-badges [data-value="feature"] input[type="color"]',
      '#cc3300',
    );
    const badge = () =>
      f.element<HTMLElement>(
        '#projectSettings-taskTypes-badges [data-value="feature"] .value-badge',
      );
    assert.equal(badge().style.getPropertyValue('--badge-color'), '#cc3300');
    f.setSaveFailure(true);
    await f.click('#projectSettings-save');
    assert.ok(f.host.querySelector('#projectSettingsForm'));
    assert.equal(badge().style.getPropertyValue('--badge-color'), '#cc3300');
    f.setSaveFailure(false);
    await f.click('#projectSettings-save');
    assert.equal(f.store.active?.model?.taskTypeColors?.feature, '#cc3300');
    assert.ok(f.store.active?.model?.taskTypes?.includes('검토'));
    await f.click('[data-workspace-page="tasks"]');
    assert.equal(
      f
        .element<HTMLElement>('.all-task-row[data-id="W001"] .value-badge')
        .style.getPropertyValue('--badge-color'),
      '#cc3300',
    );
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.active?.model?.taskTypeColors?.feature, '#a2eeef');
    await act(() => f.store.closeProject('C:/QA'));
    await act(() => f.store.open('C:/QA'));
    assert.equal(f.store.active?.model?.taskTypeColors?.feature, '#cc3300');
  } finally {
    await f.close();
  }
});

test('초기화 기본 유형은 영문 7종·기본색이며 라벨 예시는 데이터와 색상에 포함하지 않는다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    await f.click('#initializationNext');
    const types = [
      ...f.host.querySelectorAll<HTMLElement>('#initialization-taskTypes-badges li'),
    ].map((node) => node.dataset.value);
    assert.deepEqual(types, ['feature', 'bug', 'improvement', 'task', 'docs', 'spike', 'chore']);
    assert.equal(
      f.element('#initialization-taskTypes-badges [data-value="docs"] .value-badge-label')
        .textContent,
      'docs',
    );
    await f.click('#initialization-taskTypes-badges [data-value="docs"] .badge-color-control');
    assert.equal(
      f.element<HTMLInputElement>(
        '#initialization-taskTypes-badges [data-value="docs"] input[type="color"]',
      ).value,
      '#1d76db',
    );
    assert.ok(f.host.textContent?.includes('frontend, backend, api, database, security'));
    assert.equal(f.host.querySelectorAll('#initialization-labels-badges li').length, 0);
    assert.equal(f.host.querySelector('#initialization-labels-badges input[type="color"]'), null);
    await f.addBadge('#initialization-labels', 'bug');
    assert.equal(
      f
        .element<HTMLElement>('#initialization-labels-badges .value-badge')
        .style.getPropertyValue('--badge-color'),
      '',
    );
    await f.click('#initialization-taskTypes-badges [data-value="feature"] .badge-color-control');
    await act(async () => {
      f.element(
        '#initialization-taskTypes-badges [data-value="feature"] input[type="color"]',
      ).dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    });
    assert.equal(
      f
        .element('#initialization-taskTypes-badges [data-value="feature"] .badge-color-control')
        .getAttribute('aria-expanded'),
      'true',
    );
    const colorField = '#initialization-taskTypes-badges [data-value="feature"] input[type="text"]';
    const previousColor = f.element<HTMLInputElement>(
      '#initialization-taskTypes-badges [data-value="feature"] input[type="color"]',
    ).value;
    await f.value(colorField, '#xyz');
    assert.equal(f.element(colorField).getAttribute('aria-invalid'), 'true');
    assert.equal(
      f.element<HTMLInputElement>(
        '#initialization-taskTypes-badges [data-value="feature"] input[type="color"]',
      ).value,
      previousColor,
    );
    await f.value(colorField, '#ffffff');
    assert.equal(f.element(colorField).getAttribute('aria-invalid'), 'false');

    await f.click('#initializationNext');
    await f.click('#initializationSubmit');
    assert.deepEqual(f.store.active?.model?.taskTypes, types);
    assert.deepEqual(
      f.store.active?.model?.priorities?.map((p) => p.id),
      ['high', 'normal', 'low'],
    );
    assert.deepEqual(f.store.active?.model?.assignees, []);
    assert.deepEqual(f.store.active?.model?.commonLabels, ['bug']);
    assert.equal(f.store.active?.model?.taskTypeColors?.feature, '#ffffff');
  } finally {
    await f.close();
  }
});

test('프로젝트 우선순위 정렬·이름·추가와 담당자는 저장 실패 후에도 유지되고 작업 선택에 반영된다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    const ids = () =>
      [...f.host.querySelectorAll('#projectSettings-priorities li')].map(
        (node) => (node as HTMLElement).dataset.priorityId,
      );
    assert.deepEqual(ids(), ['high', 'normal', 'low']);
    assert.equal(
      f.host.querySelectorAll(
        '#projectSettings-priorities .priority-unassigned button:not(:disabled)',
      ).length,
      0,
    );
    assert.equal(
      f.element<HTMLButtonElement>(
        '#projectSettings-priorities [data-priority-id="normal"] button:last-child',
      ).disabled,
      true,
    );
    await act(async () => {
      f.element(
        '#projectSettings-priorities [data-priority-id="high"] .priority-drag',
      ).dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    assert.deepEqual(ids(), ['normal', 'high', 'low']);
    await f.value('#projectSettings-priorities [data-priority-id="normal"] input', '기본');
    await f.click('#projectSettings-priorities .priority-add');
    const customId = ids()[3]!;
    await f.value(
      '#projectSettings-priorities [data-priority-id="' + customId + '"] input',
      '긴급 검토',
    );
    await f.addBadge('#projectSettings-assignees', '팀원');
    f.setSaveFailure(true);
    await f.click('#projectSettings-save');
    assert.ok(f.host.querySelector('#projectSettingsForm'));
    assert.equal(
      f.element<HTMLInputElement>('#projectSettings-priorities [data-priority-id="normal"] input')
        .value,
      '기본',
    );
    f.setSaveFailure(false);
    await f.click('#projectSettings-save');
    assert.deepEqual(
      f.store.active?.model?.priorities?.map((p) => p.id),
      ['normal', 'high', 'low', customId],
    );
    assert.deepEqual(f.store.active?.model?.assignees, ['팀원']);
    await f.click('[data-workspace-page="tasks"]');
    await f.click('#taskAddOpen');
    assert.ok(f.element('#taskEditor-priority').textContent?.includes('미지정'));
    await f.click('#taskEditor-priority');
    await f.click('#taskEditor-priority-options [data-value="' + customId + '"]');
    await f.click('#taskEditor-owner');
    await f.click('#taskEditor-owner-options [data-value="팀원"]');
    await f.value('#taskEditor-name', '사용자 우선순위 작업');
    await f.submit();
    const row = f.store.active?.model?.rows.find((r) => r.name === '사용자 우선순위 작업');
    assert.equal(row?.priority, customId);
    assert.equal(row?.owner, '팀원');
    assert.ok(f.host.textContent?.includes('긴급 검토'));
  } finally {
    await f.close();
  }
});

test('우선순위 포인터 정렬·취소와 중복 이름 검사·기존 담당자 보존', async () => {
  const f = await fixture();
  const descriptor = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    const ids = () =>
      [...f.host.querySelectorAll('#projectSettings-priorities li')].map(
        (node) => (node as HTMLElement).dataset.priorityId,
      );
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => f.element('#projectSettings-priorities [data-priority-id="low"]'),
    });
    const handle = f.element(
      '#projectSettings-priorities [data-priority-id="high"] .priority-drag',
    );
    await act(async () => {
      handle.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    });
    await act(async () => {
      handle.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true }));
    });
    assert.deepEqual(ids(), ['normal', 'low', 'high']);
    assert.ok(f.host.querySelector('[data-priority-id="high"].priority-item-dragging'));
    assert.equal(f.element('#projectSettings-priorities ol').getAttribute('data-dragging'), 'true');
    await act(async () => {
      handle.dispatchEvent(new window.MouseEvent('pointercancel', { bubbles: true }));
    });
    assert.deepEqual(ids(), ['high', 'normal', 'low']);
    assert.equal(f.host.querySelector('.priority-item-dragging'), null);
    await f.value('#projectSettings-priorities [data-priority-id="low"] input', '중');
    await f.click('#projectSettings-save');
    assert.ok(f.host.querySelector('#projectSettingsForm'));
    await f.value('#projectSettings-priorities [data-priority-id="low"] input', '하');
    await f.click('#projectSettings-save');
    await f.click('[data-workspace-page="tasks"]');
    await f.click('[data-id="W001"]');
    await f.click('#taskEditOpen');
    assert.ok(f.element('#taskEditor-owner').textContent?.includes('codex'));
    await f.click('#taskEditor-owner');
    assert.ok(f.host.querySelector('#taskEditor-owner-options [data-value="codex"]'));
  } finally {
    if (descriptor) Object.defineProperty(document, 'elementFromPoint', descriptor);
    else Reflect.deleteProperty(document, 'elementFromPoint');
    await f.close();
  }
});

test('영어 미지정은 우선순위·담당자·마일스톤 맥락에 맞게 분리한다', async () => {
  const f = await fixture({ language: 'en' });
  try {
    await f.click('#projectManageOpen');
    assert.ok(
      f.element<HTMLInputElement>('.priority-summary .priority-unassigned input').value ===
        'No priority',
    );
    assert.equal(f.host.querySelectorAll('.priority-summary li').length, 3);
    await f.click('#projectEditOpen');
    assert.doesNotMatch(f.element('#projectSettings-priorities').textContent ?? '', /Alt\+/);
    await f.click('#projectSettings-reset');
    await f.click('[data-workspace-page="tasks"]');
    await f.click('#taskAddOpen');
    assert.ok(f.element('#taskEditor-priority').textContent?.includes('No priority'));
    assert.ok(f.element('#taskEditor-owner').textContent?.includes('Unassigned'));
    assert.ok(f.element('#taskEditor-parent').textContent?.includes('No milestone'));
  } finally {
    await f.close();
  }
});

test('우선순위 색상은 이름 대신 순서·개수로 갱신되며 미지정은 색상을 표시하지 않는다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    await f.click('#projectEditOpen');
    const color = (id: string) =>
      f
        .element<HTMLElement>('#projectSettings-priorities [data-priority-id="' + id + '"]')
        .style.getPropertyValue('--priority-color');
    assert.equal(color('high'), 'var(--color-priority-high)');
    assert.equal(color('normal'), 'var(--color-priority-middle)');
    assert.equal(color('low'), 'var(--color-priority-low)');
    await f.click('#projectSettings-priorities .priority-add');
    await f.click('#projectSettings-priorities .priority-add');
    assert.equal(color('low'), 'var(--color-priority-middle)');
    assert.match(color('normal'), /high.*50%.*middle/);
    const priorities = f.host.querySelectorAll<HTMLElement>(
      '#projectSettings-priorities [data-priority-id]',
    );
    assert.equal(
      priorities[4].style.getPropertyValue('--priority-color'),
      'var(--color-priority-low)',
    );
    assert.equal(
      f
        .element<HTMLElement>('#projectSettings-priorities .priority-unassigned')
        .style.getPropertyValue('--priority-color'),
      '',
    );
    await f.value('#projectSettings-priorities [data-priority-id="high"] input', '名前');
    assert.equal(color('high'), 'var(--color-priority-high)');
    await act(async () => {
      f.element(
        '#projectSettings-priorities [data-priority-id="high"] .priority-drag',
      ).dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    assert.equal(color('normal'), 'var(--color-priority-high)');
    await f.click('#projectSettings-save');
    await f.click('[data-workspace-page="tasks"]');
    await f.click('#taskAddOpen');
    assert.equal(f.host.querySelector('#taskEditor-priority .value-badge'), null);
    await f.click('#taskEditor-priority');
    assert.equal(
      f.host.querySelector('#taskEditor-priority-options [data-value="-"] .value-badge'),
      null,
    );
    assert.equal(
      f
        .element<HTMLElement>('#taskEditor-priority-options [data-value="normal"] .value-badge')
        .style.getPropertyValue('--badge-color'),
      'var(--color-priority-high)',
    );
  } finally {
    await f.close();
  }
});

test('초기화 최종 확인은 경로 표기·짝지은 항목·작업 규칙 순서와 빈 목록을 정리한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    await f.click('#initializationNext');
    await f.click('#initializationNext');
    const review = f.element('.initialization-review');
    const labels = [...review.querySelectorAll('dt')].map((node) => node.textContent);
    assert.deepEqual(labels, [
      '프로젝트 이름',
      '프로젝트 폴더',
      '데이터 저장 위치',
      'ID 표시 형식',
      '날짜·시간 형식',
      '작업 유형',
      '라벨',
      '담당자 목록',
      '우선순위 목록',
      '예상 작업 시간',
    ]);
    const values = [...review.querySelectorAll('dd')];
    assert.equal(values[1].textContent, 'C:\\NEW');
    assert.equal(values[2].textContent, 'docs\\worktree');
    assert.equal(values[6].textContent, '없음');
    assert.equal(values[7].textContent, '없음');
    assert.equal(review.querySelectorAll('.project-effort-options input:disabled').length, 2);
    assert.equal(
      f.element<HTMLInputElement>('.initialization-review .priority-unassigned input').disabled,
      true,
    );
    await f.click('#initializationPrevious');
    assert.ok(f.host.textContent?.includes('예상 작업 시간 사용'));
  } finally {
    await f.close();
  }
});

test('프로젝트 관리 조회와 편집은 최종 확인 기준의 순서·경로·짝지은 행을 공유한다', async () => {
  const f = await fixture();
  try {
    await f.click('#projectManageOpen');
    assert.equal(
      f.element('.project-management-actions').parentElement,
      f.element('#projectManagement'),
    );
    assert.ok(
      f.host.querySelector('#projectManagement > .project-management-scroll .project-overview'),
    );
    assert.ok(f.element('#projectResetOpen').closest('.project-management-scroll'));
    assert.equal(f.host.querySelectorAll('.project-management-actions button').length, 1);
    assert.ok(f.host.querySelector('.project-management-actions #projectEditOpen'));
    const labels = () =>
      [...f.host.querySelectorAll('#projectManagement dt')].map((node) => node.textContent);
    const expected = [
      '프로젝트 이름',
      '프로젝트 폴더',
      '데이터 저장 위치',
      'ID 표시 형식',
      '날짜·시간 형식',
      '작업 유형',
      '라벨',
      '담당자 목록',
      '우선순위 목록',
      '예상 작업 시간',
      '작업 상태',
    ];
    assert.deepEqual(labels(), expected);
    const fields = [...f.host.querySelectorAll('#projectManagement dd')];
    assert.equal(fields[1].textContent, 'C:\\QA');
    assert.equal(fields[2].textContent, 'docs\\worktree');
    assert.equal(fields[7].textContent, '없음');
    assert.equal(
      f.host.querySelectorAll('.project-effort-options input[type="radio"]:disabled').length,
      2,
    );
    await f.click('#projectEditOpen');
    assert.equal(
      f.element('.project-settings-actions').parentElement,
      f.element('#projectSettingsForm'),
    );
    assert.ok(
      f.host.querySelector(
        '#projectSettingsForm > .project-management-scroll .project-settings-fields',
      ),
    );
    assert.deepEqual(labels(), expected);
    assert.equal(f.element<HTMLInputElement>('#projectFixed-0').value, 'C:\\QA');
    assert.equal(f.element<HTMLInputElement>('#projectFixed-1').value, 'docs\\worktree');
    for (let i = 0; i < 4; i++)
      assert.equal(f.element<HTMLInputElement>('#projectFixed-' + i).disabled, true);
    assert.ok(f.host.querySelector('#projectSettings-format-date-order'));
    assert.ok(f.host.querySelector('#projectSettings-format-time'));
    await f.click('#projectSettings-useEffort');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-useEffort').checked, true);
    await f.click('#projectSettings-noEffort');
    assert.equal(f.element<HTMLInputElement>('#projectSettings-useEffort').checked, false);
    assert.equal(f.element<HTMLInputElement>('#projectSettings-noEffort').checked, true);
  } finally {
    await f.close();
  }
});

test('초기화 예상 작업 시간은 작업 규칙 라디오 선택을 최종 확인과 저장까지 유지한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    await f.click('#initializationNext');
    assert.equal(f.element<HTMLInputElement>('#initialization-noEffort').checked, true);
    await f.click('#initialization-useEffort');
    await f.click('#initializationNext');
    assert.equal(f.element<HTMLInputElement>('#initializationReview-useEffort').checked, true);
    assert.equal(f.element<HTMLInputElement>('#initializationReview-useEffort').disabled, true);
    assert.ok(f.element('.initialization-review').textContent?.includes('ID 표시 형식'));
    assert.ok(f.element('.initialization-review').textContent?.includes('날짜·시간 형식'));
    await f.click('#initializationPrevious');
    assert.equal(f.element<HTMLInputElement>('#initialization-useEffort').checked, true);
    await f.click('#initialization-noEffort');
    await f.click('#initializationNext');
    assert.equal(f.element<HTMLInputElement>('#initializationReview-noEffort').checked, true);
    await f.click('#initializationSubmit');
    assert.equal(f.store.active?.model?.useEffort, false);
  } finally {
    await f.close();
  }
});

test('초기화는 기본 정보에 이름·저장 위치를 묶고 ID·날짜시간은 작업 규칙에서 검증한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.open('C:/NEW'));
    assert.equal(f.host.querySelectorAll('.initialization-step').length, 3);
    assert.match(f.element('.initialization-step-count').textContent ?? '', /1 \/ 3/);
    assert.ok(f.host.querySelector('#initialization-name'));
    assert.ok(f.host.querySelector('#initialization-parent'));
    assert.equal(f.host.querySelector('#initialization-prefix'), null);
    assert.equal(f.host.querySelector('#initialization-format-date-order'), null);
    await f.value('#initialization-directory-name', 'custom');
    await f.click('#initializationNext');
    assert.match(f.element('.initialization-step-count').textContent ?? '', /2 \/ 3/);
    assert.ok(f.host.querySelector('#initialization-prefix'));
    assert.ok(f.host.querySelector('#initialization-format-date-order'));
    assert.equal(f.host.querySelector('#initialization-parent'), null);
    await f.value('#initialization-prefix', 'MS');
    await f.click('#initializationPrevious');
    assert.equal(f.element<HTMLInputElement>('#initialization-directory-name').value, 'custom');
    await act(async () => {
      f.element('.initialization-preview').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    assert.ok(f.host.querySelector('#initialization-prefix'));
    assert.equal(f.element('#initialization-prefix').getAttribute('aria-invalid'), 'true');
    assert.equal(f.calls.filter((call) => call.command === 'initialize_project').length, 0);
    await f.value('#initialization-prefix', 'DEV');
    await f.click('#initializationNext');
    assert.match(f.element('.initialization-step-count').textContent ?? '', /3 \/ 3/);
    assert.ok(f.host.querySelector('#initializationSubmit'));
  } finally {
    await f.close();
  }
});

test('답글 대상 번호를 표시하고 답글의 답글도 한 단계로 유지하며 원댓글 삭제 후 답글을 남긴다', async () => {
  const f = await fixture({ displayName: '박대호' });
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#previewCommentsTab');
    await f.value('#commentContent', '원댓글');
    await f.click('.comment-form button[type="submit"]');
    await f.click('.comment-reply');
    await f.value('#commentContent', '첫 답글');
    await f.click('.comment-form button[type="submit"]');
    await f.click('.comment-replies .comment-reply');
    await f.value('#commentContent', '답글의 답글');
    await f.click('.comment-form button[type="submit"]');
    assert.equal(f.host.querySelectorAll('.comment-replies > .comment').length, 2);
    assert.equal(f.host.querySelectorAll('.comment-replies .comment-replies').length, 0);
    assert.match(f.host.querySelectorAll('.comment-reference')[1].textContent ?? '', /#002/);
    const editButtons = f.host.querySelectorAll<HTMLButtonElement>('.comment-edit');
    assert.equal(editButtons[0].disabled, true);
    assert.equal(editButtons[1].disabled, true);
    assert.equal(editButtons[2].disabled, false);
    assert.match(f.element('.comment-edit-tooltip').textContent ?? '', /답글/);
    assert.equal(f.host.querySelectorAll('.comment-timestamps time').length, 3);
    await f.click('.comment-thread > .comment .comment-actions button:last-child');
    await f.click('.comment-delete-confirm');
    assert.equal(f.host.querySelectorAll('.comment-replies > .comment').length, 2);
    assert.match(f.element('.comment-thread > .comment').textContent ?? '', /삭제된 댓글/);
    assert.equal(f.host.querySelectorAll('.comment-number').length, 3);
  } finally {
    await f.close();
  }
});

test('탭 상세는 홈 화면을 유지하고 여러 작업의 탭·초안을 프로젝트별로 기억한다', async () => {
  const f = await fixture({ displayName: '박대호' });
  try {
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    assert.equal(f.element('#task-home-tab').getAttribute('aria-selected'), 'true');
    assert.ok(
      f.element('.workspace-page-heading').compareDocumentPosition(f.element('.task-tabs')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const home = f.element('#workspaceHome'),
      content = f.element('#content');
    content.scrollTop = 135;
    await act(() => {
      content.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await act(() => f.store.selectWork('W001'));
    assert.equal(f.element('#detail').tagName, 'SECTION');
    assert.equal(f.element('#detail').hasAttribute('open'), false);
    assert.equal(home.hasAttribute('hidden'), true);
    await f.click('#previewCommentsTab');
    await f.value('#commentContent', 'W001 초안');
    await act(() => f.store.selectWork('W002'));
    await act(() => f.store.selectWork('W001'));
    assert.deepEqual(f.store.active?.taskTabs, ['W001', 'W002']);
    assert.equal(f.element<HTMLTextAreaElement>('#commentContent').value, 'W001 초안');
    await f.click('#task-home-tab');
    assert.equal(home, f.element('#workspaceHome'));
    assert.equal(content, f.element('#content'));
    assert.equal(home.hasAttribute('hidden'), false);
    assert.equal(content.scrollTop, 135);
    await f.click('#task-tab-W002');
    assert.equal(
      f.element('#detailTitle').textContent,
      f.store.active!.model!.rows.find((row) => row.id === 'W002')!.name,
    );
    assert.match(f.element('#detailMeta .detail-type').textContent ?? '', /W002/);
    assert.ok(f.element('.detail-info-actions #taskDeleteOpen'));
    assert.equal(f.host.querySelector('.detail-header #taskDeleteOpen'), null);
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.host.querySelector('#task-tab-W002'), null);
    await act(() => f.store.selectWork('W001'));
    await act(() => f.store.selectProject('C:/QA'));
    assert.deepEqual(f.store.active?.taskTabs, ['W001', 'W002']);
    assert.equal(f.store.getSnapshot().selectedId, 'W002');
    await f.click('.task-tab[data-active="true"] .task-tab-close');
    assert.equal(f.store.getSnapshot().selectedId, 'W001');
    await f.click('.task-tab[data-active="true"] .task-tab-close');
    assert.equal(f.store.getSnapshot().selectedId, null);
    assert.equal(f.element('#task-home-tab').getAttribute('aria-selected'), 'true');
  } finally {
    await f.close();
  }
});

test('작업 탭은 키보드 전환·외부 작업 삭제·설정 전환·프로젝트 닫기를 처리한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    await act(() => f.store.selectWork('W001'));
    await act(() => f.store.selectWork('W002'));
    await act(() => {
      f.element('#task-tab-W002').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
      );
    });
    assert.equal(f.store.getSnapshot().selectedId, null);
    await act(() => {
      f.element('#task-home-tab').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
      );
    });
    assert.equal(f.store.getSnapshot().selectedId, 'W002');
    const changed = deleteProjectTask(f.files.get(first)!, 'W002', {
      children: 'keep',
      detachPredecessors: true,
    });
    f.files.set(first, changed);
    await act(() => f.store.poll());
    assert.deepEqual(f.store.active?.taskTabs, ['W001']);
    assert.equal(f.store.getSnapshot().selectedId, null);
    await f.click('#task-tab-W001');
    await act(() => f.store.saveSetting('detailMode', 'sidebar'));
    assert.equal(f.element<HTMLDialogElement>('#detail').open, true);
    assert.ok(f.element('#detail').classList.contains('sidebar'));
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    assert.equal(f.element('#detail').tagName, 'SECTION');
    await act(() => f.store.closeProject('C:/QA'));
    await act(() => f.store.open('C:/QA'));
    assert.deepEqual(f.store.active?.taskTabs, []);
    assert.equal(f.store.getSnapshot().selectedId, null);
  } finally {
    await f.close();
  }
});

test('상세 탭에서 검색하면 열린 작업 탭을 유지하며 홈의 필터 결과로 이동한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    await act(() => f.store.setPage('tasks'));
    const firstName = f.store.active!.model!.rows.find((row) => row.id === 'W001')!.name;
    const secondName = f.store.active!.model!.rows.find((row) => row.id === 'W002')!.name;
    await act(() => f.store.selectWork('W002'));
    assert.equal(f.element<HTMLInputElement>('#search').disabled, false);
    await f.value('#search', firstName);
    assert.equal(f.store.getSnapshot().selectedId, null);
    assert.equal(f.store.getSnapshot().page, 'tasks');
    assert.equal(f.element('#task-home-tab').getAttribute('aria-selected'), 'true');
    assert.ok(f.element('#content').textContent?.includes(firstName));
    assert.ok(!f.element('#content').textContent?.includes(secondName));
    assert.deepEqual(f.store.active!.taskTabs, ['W002']);
    for (const page of ['analytics', 'project'] as const) {
      await act(() => f.store.setPage(page));
      assert.equal(f.host.querySelector('.task-tabs'), null);
      assert.equal(f.element('#detail').hasAttribute('hidden'), true);
      assert.equal(f.element('#workspaceHome').hasAttribute('hidden'), false);
      assert.equal(f.element<HTMLInputElement>('#search').disabled, true);
      assert.deepEqual(f.store.active!.taskTabs, ['W002']);
    }
    await act(() => f.store.setPage('board'));
    await f.click('#task-tab-W002');
    assert.equal(f.element<HTMLInputElement>('#search').disabled, false);
    await f.value('#search', secondName);
    assert.equal(f.store.getSnapshot().page, 'board');
    assert.equal(f.store.getSnapshot().selectedId, null);
    assert.equal(f.store.getSnapshot().query, secondName);
  } finally {
    await f.close();
  }
});

test('작업 탭의 휠 클릭은 비활성 탭을 선택하지 않고 닫으며 홈 탭은 유지한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    await act(() => f.store.selectWork('W001'));
    await act(() => f.store.selectWork('W002'));
    await act(() => {
      f.element('#task-tab-W001').dispatchEvent(
        new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }),
      );
    });
    assert.deepEqual(f.store.active!.taskTabs, ['W002']);
    assert.equal(f.store.getSnapshot().selectedId, 'W002');
    await act(() => {
      f.element('#task-tab-W002').dispatchEvent(
        new MouseEvent('auxclick', { button: 2, bubbles: true, cancelable: true }),
      );
    });
    assert.deepEqual(f.store.active!.taskTabs, ['W002']);
    await act(() => {
      f.element('#task-tab-W002').dispatchEvent(
        new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }),
      );
    });
    assert.equal(f.store.getSnapshot().selectedId, null);
    assert.deepEqual(f.store.active!.taskTabs, []);
    await act(() => {
      f.element('#task-home-tab').dispatchEvent(
        new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }),
      );
    });
    assert.ok(f.element('#task-home-tab'));
  } finally {
    await f.close();
  }
});

test('작업·프로젝트 탭은 공용 재정렬과 휠 가로 스크롤을 사용하고 홈은 고정한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    await act(() => f.store.selectWork('W001'));
    await act(() => f.store.selectWork('W002'));
    const strip = f.element('.task-tabs');
    strip.getBoundingClientRect = () => ({
      left: 0,
      right: 300,
      top: 0,
      bottom: 30,
      width: 300,
      height: 30,
      x: 0,
      y: 0,
      toJSON() {},
    });
    f.host.querySelectorAll<HTMLElement>('.task-tab').forEach((tab, index) => {
      tab.getBoundingClientRect = () => ({
        left: 40 + index * 100,
        right: 140 + index * 100,
        top: 0,
        bottom: 30,
        width: 100,
        height: 30,
        x: 40 + index * 100,
        y: 0,
        toJSON() {},
      });
    });
    await act(() => {
      f.element('#task-tab-W002').dispatchEvent(
        new MouseEvent('pointerdown', { button: 0, clientX: 180, clientY: 15, bubbles: true }),
      );
      strip.dispatchEvent(
        new MouseEvent('pointermove', {
          button: 0,
          clientX: 60,
          clientY: 15,
          bubbles: true,
          cancelable: true,
        }),
      );
      strip.dispatchEvent(
        new MouseEvent('pointerup', { button: 0, clientX: 60, clientY: 15, bubbles: true }),
      );
    });
    assert.deepEqual(f.store.active!.taskTabs, ['W002', 'W001']);
    await f.click('#task-tab-W001');
    assert.equal(f.store.getSnapshot().selectedId, 'W002');
    assert.equal(f.element('.task-tabs').firstElementChild?.id, 'task-home-tab');
    await act(() =>
      f.element('#task-tab-W002').dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          altKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    assert.deepEqual(f.store.active!.taskTabs, ['W001', 'W002']);
    await act(() =>
      f.element('#tabs [data-tab="1"]').dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowLeft',
          altKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    assert.deepEqual(
      f.store.getSnapshot().projects.map((project) => project.path),
      ['C:/QB', 'C:/QA'],
    );
    for (const selector of ['.task-tabs', '#tabs']) {
      const root = f.element(selector);
      Object.defineProperty(root, 'scrollWidth', { configurable: true, value: 600 });
      Object.defineProperty(root, 'clientWidth', { configurable: true, value: 120 });
      const wheel = new window.WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true });
      root.dispatchEvent(wheel);
      assert.equal(wheel.defaultPrevented, true);
      assert.equal(root.scrollLeft, 80);
    }
  } finally {
    await f.close();
  }
});

test('앱 재시작 후 작업 탭 순서·활성 작업을 프로젝트별로 복원하고 삭제된 작업을 제외한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    await act(() => f.store.selectWork('W001'));
    await act(() => f.store.selectWork('W002'));
    await act(() => f.store.reorderTaskTabs('W002', 'W001', false));
    await act(() => f.store.selectProject('C:/QB'));
    await act(() => f.store.selectWork('W001'));
    await act(() => f.store.selectProject('C:/QA'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const saved = structuredClone(
      f.calls.filter((call) => call.command === 'save_session').at(-1)!.args!.session,
    );
    const restart = (delayedSettings = false) =>
      new WorkspaceStore({
        ...f.platform,
        invoke: async <T,>(command: string, args?: Record<string, unknown>) => {
          if (command === 'load_session') return structuredClone(saved) as T;
          if (command === 'load_settings') {
            if (delayedSettings) await new Promise((resolve) => setTimeout(resolve, 20));
            return {
              settings: {
                schemaVersion: 2,
                language: 'ko',
                detailMode: 'tabs',
                idSeparator: 'none',
                autoCheckUpdates: false,
                displayName: '',
              },
            } as T;
          }
          return f.platform.invoke<T>(command, args);
        },
      });
    for (const delayed of [false, true]) {
      const restored = restart(delayed);
      await restored.initialize();
      assert.deepEqual(restored.active!.taskTabs, ['W002', 'W001']);
      assert.equal(restored.getSnapshot().selectedId, 'W002');
      await restored.selectProject('C:/QB');
      assert.deepEqual(restored.active!.taskTabs, ['W001']);
      assert.equal(restored.getSnapshot().selectedId, 'W001');
    }
    f.files.set(
      first,
      deleteProjectTask(f.files.get(first)!, 'W002', {
        children: 'keep',
        detachPredecessors: true,
      }),
    );
    const restored = restart();
    await restored.initialize();
    assert.deepEqual(restored.active!.taskTabs, ['W001']);
    assert.equal(restored.getSnapshot().selectedId, null);
  } finally {
    await f.close();
  }
});

test('작업 수정은 상세 내부에서 열리고 삭제 모달 뒤에서도 탭·분할 상세를 유지한다', async () => {
  const f = await fixture();
  try {
    for (const mode of ['tabs', 'sidebar'] as const) {
      await act(() => f.store.saveSetting('detailMode', mode));
      await act(() => f.store.selectWork('W001'));
      const title = f.element('#detailTitle').textContent;
      await f.click('#taskEditOpen');
      assert.equal(f.element('#taskEditor').tagName, 'SECTION');
      assert.ok(f.element('#detail').contains(f.element('#taskEditor')));
      assert.ok(f.element('#detailTitle').contains(f.element('#taskEditor-name')));
      assert.equal(
        f.element<HTMLInputElement>('#taskEditor-name').form,
        f.element('#taskEditorForm'),
      );
      assert.equal(f.host.querySelectorAll('#taskEditor-name').length, 1);
      assert.equal(f.host.querySelector('#taskEditor .task-editor-field input[readonly]'), null);
      assert.equal(f.element('#detail').hasAttribute('hidden'), false);
      if (mode === 'sidebar') assert.equal(f.element<HTMLDialogElement>('#detail').open, true);
      assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, title);
      await f.click('#taskEditorCancel');
      await f.click('#taskDeleteOpen');
      assert.equal(f.element('#detail').hasAttribute('hidden'), false);
      if (mode === 'sidebar') assert.equal(f.element<HTMLDialogElement>('#detail').open, true);
      assert.equal(f.element('#detailTitle').textContent, title);
      await f.click('#taskDeleteCancel');
    }
  } finally {
    await f.close();
  }
});

test('삭제·초기화 모달은 배경 클릭으로 닫고 내부에서 시작한 조작은 닫지 않는다', async () => {
  const f = await fixture();
  const backdrop = async (selector: string, startOutside = true, cancel = false) => {
    const modal = f.element(selector);
    modal.getBoundingClientRect = () => ({
      left: 100,
      right: 600,
      top: 100,
      bottom: 500,
      width: 500,
      height: 400,
      x: 100,
      y: 100,
      toJSON() {},
    });
    await act(() => {
      modal.dispatchEvent(
        new MouseEvent('pointerdown', {
          button: 0,
          clientX: startOutside ? 50 : 150,
          clientY: 150,
          bubbles: true,
        }),
      );
      if (cancel) modal.dispatchEvent(new Event('pointercancel', { bubbles: true }));
      modal.dispatchEvent(
        new MouseEvent('click', { button: 0, clientX: 50, clientY: 150, bubbles: true }),
      );
    });
  };
  try {
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskDeleteOpen');
    await backdrop('#taskDeleteDialog', false);
    assert.ok(f.host.querySelector('#taskDeleteDialog'));
    await backdrop('#taskDeleteDialog', true, true);
    assert.ok(f.host.querySelector('#taskDeleteDialog'));
    await backdrop('#taskDeleteDialog');
    assert.equal(f.host.querySelector('#taskDeleteDialog'), null);
    assert.ok(readSource(f.files.get(first)!).files['tasks/W001.md']);
    await act(() => f.store.setPage('project'));
    await f.click('#projectResetOpen');
    await backdrop('#projectResetDialog');
    assert.equal(f.host.querySelector('#projectResetDialog'), null);
    assert.ok(f.files.has(first));
  } finally {
    await f.close();
  }
});

test('작성 탭 저장 처리 중에는 취소 버튼이 비활성이고 저장 후 상세로 전환한다', async () => {
  const f = await fixture();
  let release: () => void = () => {};
  try {
    const original = f.platform.invoke.bind(f.platform);
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    f.platform.invoke = async <T,>(command: string, args?: Record<string, unknown>) => {
      if (command === 'save_project') await gate;
      return original<T>(command, args);
    };
    await act(() => f.store.selectWork('W001'));
    await f.click('#taskAddOpen');
    await f.value('#taskEditor-name', '저장 중');
    await f.click('#taskEditorSave');
    assert.ok(f.element<HTMLButtonElement>('#taskEditorCancel').disabled);
    assert.ok(f.host.querySelector('#taskEditor'));
    await act(async () => {
      release();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(f.host.querySelector('#taskEditor'), null);
  } finally {
    release();
    await f.close();
  }
});

test('칸반은 상태 뱃지 대신 유형을 ID 행에 두고 보기 간 우선순위 색상을 유지한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.setView('board'));
    const card = f.element<HTMLElement>('.lane .task[data-id="W001"]');
    assert.equal(card.querySelector('.tag'), null);
    assert.match(card.querySelector('.task-card-heading')?.textContent ?? '', /W001.*feature/);
    const color = card.style.getPropertyValue('--task-priority-color');
    assert.ok(color && color !== 'transparent');
    await act(() => f.store.setView('tree'));
    assert.ok(f.element('.task[data-id="W001"] .tag'));
    assert.equal(
      f
        .element<HTMLElement>('.task[data-id="W001"]')
        .style.getPropertyValue('--task-priority-color'),
      color,
    );
    await act(() => f.store.setPage('tasks'));
    assert.equal(
      f
        .element<HTMLElement>('.all-task-row[data-id="W001"] .all-task-id')
        .style.getPropertyValue('--task-priority-color'),
      color,
    );
  } finally {
    await f.close();
  }
});

test('최근 기록 제거는 프로젝트와 파일을 유지하고 세션에 반영하며 다시 열면 복원한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.selectProject('C:/QA'));
    const paths = f.store.getSnapshot().projects.map((project) => project.path);
    const files = [...f.files];
    await f.click('#recentOpen');
    await f.click('#recentFiles .recent-project-remove');
    assert.equal(f.store.getSnapshot().recent.includes('C:/QA'), false);
    assert.deepEqual(
      f.store.getSnapshot().projects.map((project) => project.path),
      paths,
    );
    assert.deepEqual([...f.files], files);
    const saved = f.calls.filter((call) => call.command === 'save_session').at(-1)?.args
      ?.session as { recentProjects: string[] };
    assert.ok(saved);
    assert.equal(saved.recentProjects.includes('C:/QA'), false);
    await act(() => f.store.selectProject('C:/QA'));
    assert.equal(f.store.getSnapshot().recent[0], 'C:/QA');
  } finally {
    await f.close();
  }
});

test('작업과 마일스톤 수정은 상세 X 버튼의 자리를 유지하며 숨긴다', async () => {
  const f = await fixture();
  try {
    for (const id of ['W001', 'MS001']) {
      await act(() => f.store.selectWork(id));
      await f.click('#taskEditOpen');
      const close = f.element<HTMLButtonElement>('#detail #close');
      assert.equal(close.style.visibility, 'hidden');
      assert.equal(close.hidden, false);
      assert.equal(close.tabIndex, -1);
      assert.equal(close.getAttribute('aria-hidden'), 'true');
      await f.click('#taskEditorCancel');
      assert.equal(f.element<HTMLElement>('#detail #close').style.visibility, '');
    }
  } finally {
    await f.close();
  }
});

test('작업·마일스톤은 탭 이동 시 수정 초안을 유지하지만 닫고 다시 열면 정보 화면이다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.saveSetting('detailMode', 'tabs'));
    for (const id of ['W001', 'MS001']) {
      const originalName = f.store.active!.model!.rows.find((row) => row.id === id)!.name;
      await act(() => f.store.selectWork(id));
      await f.click('#taskEditOpen');
      await f.value('#taskEditor-name', '저장하지 않은 초안');
      await act(() => f.store.selectWork('W002'));
      await act(() => f.store.selectWork(id));
      assert.equal(f.element<HTMLInputElement>('#taskEditor-name').value, '저장하지 않은 초안');
      await f.click('#task-tab-' + id + ' + .task-tab-close');
      await act(() => f.store.selectWork(id));
      assert.equal(f.host.querySelector('#taskEditor'), null);
      assert.ok(f.element('#taskEditOpen'));
      assert.equal(f.element('#detailTitle').textContent, originalName);
    }
  } finally {
    await f.close();
  }
});

test('작업분류 필터를 선택해 목록을 좁히고 프로젝트 전환 시 초기화한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.setPage('tasks'));
    await f.click('#taskTypeFilter');
    await f.click('#taskTypeFilter-options [data-value="type:bug"]');
    assert.equal(f.store.getSnapshot().taskType, 'type:bug');
    assert.equal(f.host.querySelector('.all-task-row'), null);
    await f.click('#taskTypeFilter');
    await f.click('#taskTypeFilter-options [data-value="type:feature"]');
    assert.equal(f.host.querySelectorAll('.all-task-row').length, 2);
    await act(() => f.store.setFilters({ owner: 'owner:codex' }));
    assert.equal(f.host.querySelectorAll('.all-task-row').length, 1);
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.getSnapshot().taskType, 'all');
  } finally {
    await f.close();
  }
});

test('상세 정보 표시 설정은 공용 드롭다운으로 선택하고 저장한다', async () => {
  const f = await fixture();
  try {
    await f.click('#settingsOpen');
    assert.equal(f.host.querySelector('#settings select'), null);
    await f.click('#detailMode');
    await f.click('#detailMode-options [data-value="tabs"]');
    assert.equal(f.store.getSnapshot().settings.detailMode, 'tabs');
    await f.click('#detailMode');
    await f.click('#detailMode-options [data-value="sidebar"]');
    assert.equal(f.store.getSnapshot().settings.detailMode, 'sidebar');
  } finally {
    await f.close();
  }
});

test('작업 목록은 ID·제목·분류를 별도 열로 표시하고 행 전체에서 상세를 연다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.setPage('tasks'));
    assert.deepEqual(
      [...f.host.querySelectorAll('.all-tasks th')].map((node) => node.textContent),
      ['ID', '제목', '분류', '상태', '담당자', '종료일'],
    );
    const row = f.element('.all-task-row[data-id="W001"]').closest('tr')!;
    const cells = row.querySelectorAll('td');
    assert.equal(cells.length, 6);
    assert.match(cells[0].textContent ?? '', /W001/);
    assert.equal(cells[1].textContent, '댓글 구현');
    assert.equal(cells[2].textContent, 'feature');
    for (const index of [0, 1, 2, 3, 4, 5]) {
      await act(() => f.store.selectWork(null));
      await f.click('.all-task-row[data-id="W001"] td:nth-child(' + (index + 1) + ')');
      assert.equal(f.store.getSnapshot().selectedId, 'W001');
    }
    for (const key of ['Enter', ' ']) {
      await act(() => f.store.selectWork(null));
      await act(() => {
        f.element('.all-task-row[data-id="W001"]').dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
      });
      assert.equal(f.store.getSnapshot().selectedId, 'W001');
    }
  } finally {
    await f.close();
  }
});

test('우선순위 필터는 다른 조건과 조합하고 프로젝트 전환 시 해제한다', async () => {
  const f = await fixture();
  try {
    await act(() => f.store.setPage('tasks'));
    await f.click('#priorityFilter');
    await f.click('#priorityFilter-options [data-value="priority:high"]');
    assert.equal(f.host.querySelectorAll('.all-task-row').length, 0);
    await f.click('#priorityFilter');
    await f.click('#priorityFilter-options [data-value="priority:normal"]');
    assert.equal(f.host.querySelectorAll('.all-task-row').length, 2);
    await act(() => f.store.setFilters({ owner: 'owner:codex' }));
    assert.equal(f.host.querySelectorAll('.all-task-row').length, 1);
    await act(() => f.store.selectProject('C:/QB'));
    assert.equal(f.store.getSnapshot().priority, 'all');
  } finally {
    await f.close();
  }
});

test('하루 일정은 작업·마일스톤 생성과 수정에서 날짜를 동기화하고 체크 해제를 지원한다', async () => {
  const f = await fixture();
  try {
    for (const button of ['#taskAddOpen', '#milestoneAddOpen']) {
      await f.click(button);
      await f.value('#taskEditor-name', '하루 일정 확인');
      await f.click('#taskEditor-sameDay');
      await f.value('#taskEditor-start', '2026-10-23');
      assert.equal(f.element<HTMLInputElement>('#taskEditor-end').value, '2026-10-23');
      assert.equal(f.element<HTMLInputElement>('#taskEditor-end').disabled, true);
      await f.value('#taskEditor-start', '2026-10-24');
      assert.equal(f.element<HTMLInputElement>('#taskEditor-end').value, '2026-10-24');
      await f.submit();
      const id = f.store.getSnapshot().selectedId!;
      assert.equal(f.store.active!.model!.rows.find((row) => row.id === id)!.end, '2026-10-24');
      await f.click('#taskEditOpen');
      assert.equal(f.element<HTMLInputElement>('#taskEditor-sameDay').checked, true);
      await f.value('#taskEditor-start', '2026-10-25');
      assert.equal(f.element<HTMLInputElement>('#taskEditor-end').value, '2026-10-25');
      await f.click('#taskEditor-sameDay');
      assert.equal(f.element<HTMLInputElement>('#taskEditor-end').disabled, false);
      await f.value('#taskEditor-end', '2026-10-26');
      await f.submit();
      const row = f.store.active!.model!.rows.find((row) => row.id === id)!;
      assert.equal(row.start, '2026-10-25');
      assert.equal(row.end, '2026-10-26');
    }
  } finally {
    await f.close();
  }
});

test('업데이트 안내 닫기는 레드닷을 유지하고 설정 방문은 같은 버전 알림을 해제한다', async () => {
  for (const kind of ['available', 'manual']) {
    const f = await fixture({ autoCheckUpdates: true, updateKind: kind, updateVersion: '9.0.0' });
    try {
      assert.ok(f.host.querySelector('.settings-update-dot'));
      assert.match(f.element('.settings-update-notice').textContent ?? '', /9.0.0/);
      assert.equal(f.calls.filter((call) => call.command === 'check_app_update').length, 1);
      await f.click('#updateNoticeClose');
      assert.equal(f.host.querySelector('.settings-update-notice'), null);
      assert.ok(f.host.querySelector('.settings-update-dot'));
      await f.click('#settingsOpen');
      assert.equal(f.host.querySelector('.settings-update-dot'), null);
      await f.click('#settingsAboutTab');
      assert.match(f.element('#updateTitle').textContent ?? '', /9.0.0/);
      await f.click('#checkUpdates');
      await f.click('#settingsClose');
      assert.equal(f.host.querySelector('.settings-update-dot'), null);
      assert.equal(f.host.querySelector('.settings-update-notice'), null);
      assert.equal(f.calls.filter((call) => call.command === 'install_app_update').length, 0);
    } finally {
      await f.close();
    }
  }
});

test('최신·개발·미공개 상태와 자동 확인 비활성에서는 업데이트 알림을 표시하지 않는다', async () => {
  for (const kind of ['latest', 'ahead', 'no-release']) {
    const f = await fixture({ autoCheckUpdates: true, updateKind: kind });
    try {
      assert.equal(f.host.querySelector('.settings-update-dot'), null);
      assert.equal(f.host.querySelector('.settings-update-notice'), null);
    } finally {
      await f.close();
    }
  }
  const f = await fixture({ autoCheckUpdates: false, updateKind: 'available' });
  try {
    assert.equal(f.calls.filter((call) => call.command === 'check_app_update').length, 0);
    assert.equal(f.host.querySelector('.settings-update-dot'), null);
  } finally {
    await f.close();
  }
});
